import React, { useState } from 'react';
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
import { FilePlus2, Smartphone, Database, Download } from 'lucide-react';
import { Repair } from '@shared/schema';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Farben für Diagramme
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface DetailedStats {
  byDeviceType: Record<string, number>;
  byBrand: Record<string, number>;
  byIssue: Record<string, number>;
  mostRecentRepairs: Repair[];
}

const deviceTypeLabels: Record<string, string> = {
  'smartphone': 'Smartphones',
  'tablet': 'Tablets',
  'laptop': 'Laptops'
};

export function StatisticsTab() {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  // Abfrage für detaillierte Statistiken
  const { data: detailedStats, isLoading } = useQuery<DetailedStats>({
    queryKey: ['/api/stats/detailed'],
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
    
    alert('PDF-Export wird vorbereitet... Diese Funktion benötigt die jsPDF-Bibliothek, die noch nicht installiert ist.');
    
    // In einer vollständigen Implementierung würden wir hier jsPDF verwenden
    // um ein PDF zu erstellen und herunterzuladen
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">
          Reparaturstatistik
        </h1>
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