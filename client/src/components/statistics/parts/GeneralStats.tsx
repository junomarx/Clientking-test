import React from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FilePlus2, Smartphone, Database, Download, Users, FileText } from 'lucide-react';
import { Repair } from '@shared/schema';

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

interface GeneralStatsProps {
  stats: Stats | undefined;
  detailedStats: DetailedStats | undefined;
  deviceTypeChartRef: React.RefObject<HTMLDivElement>;
  brandChartRef: React.RefObject<HTMLDivElement>;
  issueChartRef: React.RefObject<HTMLDivElement>;
}

const deviceTypeLabels: Record<string, string> = {
  'smartphone': 'Smartphones',
  'tablet': 'Tablets',
  'laptop': 'Laptops',
  'watch': 'Smartwatches',
  'spielekonsole': 'Spielekonsolen'
};

export const GeneralStats: React.FC<GeneralStatsProps> = ({ 
  stats, 
  detailedStats,
  deviceTypeChartRef,
  brandChartRef,
  issueChartRef
}) => {
  if (!stats || !detailedStats) return null;

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
    
  return (
    <>
      {/* Kennzahlenkarten */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <FilePlus2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Aufträge</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Bearbeitung</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inRepair}</div>
            <p className="text-xs text-muted-foreground">offene Aufträge</p>
            {stats.readyForPickup > 0 && (
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
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">erledigte Aufträge</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kunden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customerCount || 0}</div>
            <p className="text-xs text-muted-foreground">registrierte Kunden</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Diagramme */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Gerätetypen-Diagramm */}
        <Card>
          <CardHeader>
            <CardTitle>Gerätetypen</CardTitle>
            <CardDescription>Verteilung nach Art der Geräte</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px]" ref={deviceTypeChartRef}>
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
                  <Legend />
                  <Tooltip formatter={(value) => [`${value} Geräte`, 'Anzahl']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Marken-Diagramm */}
        <Card>
          <CardHeader>
            <CardTitle>Hersteller</CardTitle>
            <CardDescription>Verteilung nach Marken</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px]" ref={brandChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {brandData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => [`${value} Geräte`, 'Anzahl']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Häufigste Probleme */}
        <Card>
          <CardHeader>
            <CardTitle>Häufigste Probleme</CardTitle>
            <CardDescription>Top 8 gemeldete Probleme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" ref={issueChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={issueData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} mal`, 'Anzahl']} />
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
      </div>
    </>
  );
};