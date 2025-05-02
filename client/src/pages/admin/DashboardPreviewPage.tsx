import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RepairStatusChart } from '@/components/dashboard/RepairStatusChart';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Printer, 
  ShoppingBag, 
  TrendingUp, 
  Wrench, 
  Clock,
  BarChart,
  Search,
  Filter,
  Plus,
  Menu,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Users,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Status-Badge-Hilfsfunktion
function getStatusBadge(status: string) {
  switch (status) {
    case 'eingegangen':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Neu</Badge>;
    case 'in_reparatur':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Arbeit</Badge>;
    case 'fertig':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Fertig</Badge>;
    case 'abgeholt':
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Abgeholt</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
  }
}

// Mock-Daten für die Vorschau (basierend auf realen Daten)
const MOCK_REPAIRS = [
  { id: 1, orderCode: 'AS1234', customerName: 'Max Mustermann', deviceType: 'Smartphone', brand: 'Apple', model: 'iPhone 13', status: 'eingegangen', createdAt: '2025-05-01' },
  { id: 2, orderCode: 'SS5678', customerName: 'Maria Schmidt', deviceType: 'Smartphone', brand: 'Samsung', model: 'Galaxy S22', status: 'in_reparatur', createdAt: '2025-05-01' },
  { id: 3, orderCode: 'XL9012', customerName: 'Thomas Weber', deviceType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad X1', status: 'fertig', createdAt: '2025-05-01' },
  { id: 4, orderCode: 'HL3456', customerName: 'Anna Meier', deviceType: 'Smartphone', brand: 'Huawei', model: 'P40 Pro', status: 'abgeholt', createdAt: '2025-04-30' },
  { id: 5, orderCode: 'AS7890', customerName: 'Julia Fischer', deviceType: 'Tablet', brand: 'Apple', model: 'iPad Pro', status: 'eingegangen', createdAt: '2025-04-30' },
];

// StatCard-Komponente für das Dashboard
function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Card className="border shadow-sm hover:shadow transition-shadow">
      <CardContent className="p-4 flex items-center">
        <div className={`p-2 rounded-md ${color} mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-xl font-bold">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPreviewPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'repairs' | 'customers' | 'statistics' | 'cost-estimates' | 'settings'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Seitenleiste */}
      <div 
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white h-screen fixed transition-all duration-300 ease-in-out overflow-y-auto`}
        style={{ paddingLeft: sidebarCollapsed ? '0.75rem' : '1.5rem', paddingRight: sidebarCollapsed ? '0.75rem' : '1.5rem', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
      >
        <div className="mb-8 flex items-center justify-center md:justify-start">
          {sidebarCollapsed ? (
            <div className="flex justify-center w-full">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold">
                HS
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-bold">Handyshop</h2>
          )}
        </div>
        
        <nav className="space-y-4">
          <div 
            className={`flex items-center p-2 rounded-md hover:bg-gray-800 text-blue-400 font-medium cursor-pointer`}
          >
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Dashboard</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300 cursor-pointer`}
          >
            <Wrench className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Reparaturen</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300 cursor-pointer`}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Kunden</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300 cursor-pointer`}
          >
            <BarChart className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Statistiken</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300 cursor-pointer`}
          >
            <Printer className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Kostenvoranschläge</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300 cursor-pointer mt-8`}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Einstellungen</span>}
          </div>
        </nav>
      </div>
      
      {/* Toggle Button für die Seitenleiste */}
      <div 
        className={`fixed z-10 bg-gray-900 text-white rounded-full flex items-center justify-center w-6 h-6 cursor-pointer transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'left-14' : 'left-60'}`}
        style={{ top: '1.5rem' }} 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </div>
      
      {/* Hauptinhalt */}
      <div className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} flex-1 flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <Header variant="app" />
        
        {/* Hauptinhalt */}
        <div className="flex-1 overflow-auto p-6">
          <div className="container mx-auto">
            {/* Dashboard Header mit Suchfeld */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500">Willkommen zurück! Hier ist eine Übersicht Ihrer Reparaturen.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input className="pl-9 pr-4 py-2 w-64" placeholder="Suche nach Aufträgen, Kunden..." />
                </div>
                
                <Button variant="outline" className="h-10 px-3">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                
                <Button className="h-10 px-4 bg-primary text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Auftrag
                </Button>
              </div>
            </div>
            
            {/* Statistik-Karten */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="Neue Aufträge" 
                value="2" 
                icon={<ShoppingBag className="h-5 w-5 text-blue-700" />} 
                color="bg-blue-100 text-blue-700" 
              />
              
              <StatCard 
                title="In Arbeit" 
                value="3" 
                icon={<Wrench className="h-5 w-5 text-yellow-700" />} 
                color="bg-yellow-100 text-yellow-700" 
              />
              
              <StatCard 
                title="Fertig zur Abholung" 
                value="4" 
                icon={<Clock className="h-5 w-5 text-green-700" />} 
                color="bg-green-100 text-green-700" 
              />
              
              <StatCard 
                title="Umsatz (Monat)" 
                value="1.450,00 €" 
                icon={<TrendingUp className="h-5 w-5 text-purple-700" />} 
                color="bg-purple-100 text-purple-700" 
              />
            </div>
            
            {/* Hauptinhalt - Karten */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Aktuelle Reparaturen */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-0">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>Aktuelle Reparaturen</CardTitle>
                        <CardDescription>Die neuesten Aufträge in Ihrem System</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary">
                        Alle anzeigen <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Auftrag</TableHead>
                          <TableHead>Kunde</TableHead>
                          <TableHead>Gerät</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MOCK_REPAIRS.map((repair) => (
                          <TableRow key={repair.id} className="cursor-pointer hover:bg-gray-50">
                            <TableCell className="font-medium">{repair.orderCode}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{repair.customerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {repair.customerName}
                              </div>
                            </TableCell>
                            <TableCell>
                              {repair.brand} {repair.model}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(repair.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              
              {/* Statistik-Grafik */}
              <div>
                <RepairStatusChart 
                  stats={{
                    inRepair: 1,
                    readyForPickup: 1,
                    outsourced: 0,
                    completed: 3
                  }}
                  variant="modern"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}