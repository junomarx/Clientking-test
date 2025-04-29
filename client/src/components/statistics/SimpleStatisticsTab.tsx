import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FilePlus2, FileText, Database, Users, Download } from 'lucide-react';
import { Repair } from '@shared/schema';

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

// Eine einfache, reduzierte Version des StatisticsTabs, die nur Basisstatistiken anzeigt
// und keine problematischen Hooks verwendet
export function StatisticsTab() {
  // Basisdaten für Statistiken laden
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['/api/stats'],
  });

  // Alle Reparaturen für Export
  const { data: repairs } = useQuery<Repair[]>({
    queryKey: ['/api/repairs'],
  });

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
        
        {/* Export-Optionen */}
        <div className="flex gap-2 mt-4 md:mt-0">
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

      {/* Hinweis für zukünftige Verbesserungen */}
      <div className="mt-8 bg-muted p-4 rounded-md text-center">
        <p className="text-sm text-muted-foreground">
          Für detaillierte Statistiken und Umsatzanalysen nutzen Sie bitte die Exportfunktion. 
          Weitere Visualisierungen werden in einem zukünftigen Update verfügbar sein.
        </p>
      </div>
    </div>
  );
}