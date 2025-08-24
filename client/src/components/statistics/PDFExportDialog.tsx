import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFExportDialog({ open, onOpenChange }: PDFExportDialogProps) {
  const [startDate, setStartDate] = useState(() => {
    // Standardwert: Beginn des aktuellen Monats
    const date = new Date();
    return format(new Date(date.getFullYear(), date.getMonth(), 1), 'yyyy-MM-dd');
  });
  
  const [endDate, setEndDate] = useState(() => {
    // Standardwert: heute
    return format(new Date(), 'yyyy-MM-dd');
  });
  
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // Ende des Tages

      const params = new URLSearchParams({
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString()
      });

      // Statistikdaten abrufen (gleiche Methode wie bei Kostenvoranschlägen)
      const response = await fetch(`/api/statistics/pdf?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Statistikdaten');
      }

      const statisticsData = await response.json();
      
      // PDF-Generierung mit jsPDF (gleiche Methode wie bei Kostenvoranschlägen)
      const { generateStatisticsPDF } = await import('./StatisticsPDFGenerator');
      await generateStatisticsPDF(statisticsData, startDate, endDate);

      // Dialog schließen nach erfolgreichem Export
      onOpenChange(false);
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('Fehler beim Generieren der PDF-Statistik');
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickSelect = (period: 'thisMonth' | 'lastMonth' | 'thisYear' | 'last30Days') => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();

    switch (period) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'last30Days':
        start = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF-Statistik exportieren
          </DialogTitle>
          <DialogDescription>
            Wählen Sie den Zeitraum für die Statistikauswertung. Das PDF enthält detaillierte Analysen zu Reparaturen, Umsätzen und Gerätetypen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Schnellauswahl */}
          <div>
            <Label className="text-sm font-medium">Schnellauswahl</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('thisMonth')}
                className="text-xs"
              >
                Dieser Monat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('lastMonth')}
                className="text-xs"
              >
                Letzter Monat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('last30Days')}
                className="text-xs"
              >
                Letzte 30 Tage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('thisYear')}
                className="text-xs"
              >
                Dieses Jahr
              </Button>
            </div>
          </div>

          {/* Manuelle Datumsauswahl */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Von</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">Bis</Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Statistik-Übersicht */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Die PDF-Statistik enthält:</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Reparatur-Flow (Eingänge vs. Abholungen)</li>
              <li>• Umsatz-Analysen (abgeholt und ausstehend)</li>
              <li>• Reparaturen pro Gerätetyp</li>
              <li>• Marken-Statistiken nach Gerätetyp</li>
              <li>• Modell-Aufschlüsselung</li>
              <li>• "Außer Haus" Reparaturen</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Abbrechen
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Wird erstellt...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                PDF exportieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}