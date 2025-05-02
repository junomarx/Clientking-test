import React, { useState } from 'react';
import { Search, Filter, Settings, ChevronLeft, ChevronRight, Menu, Pencil, Printer, Mail, Star, Plus, PhoneCall, Clock, BarChart, Users, FileText, Smartphone, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Modal-Typen
type ActivePage = 'dashboard' | 'repairs' | 'customers' | 'statistics' | 'emails' | 'settings';

// Mock-Daten für die Vorschau
const MOCK_REPAIRS = [
  { id: 1, orderCode: 'AS1234', customerName: 'Max Mustermann', deviceType: 'Smartphone', brand: 'Apple', model: 'iPhone 13', status: 'eingegangen', createdAt: '2025-04-28' },
  { id: 2, orderCode: 'SS5678', customerName: 'Maria Schmidt', deviceType: 'Smartphone', brand: 'Samsung', model: 'Galaxy S22', status: 'in_reparatur', createdAt: '2025-04-29' },
  { id: 3, orderCode: 'XL9012', customerName: 'Thomas Weber', deviceType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad X1', status: 'fertig', createdAt: '2025-04-30' },
  { id: 4, orderCode: 'HL3456', customerName: 'Anna Meier', deviceType: 'Smartphone', brand: 'Huawei', model: 'P40 Pro', status: 'abgeholt', createdAt: '2025-05-01' },
  { id: 5, orderCode: 'AS7890', customerName: 'Julia Fischer', deviceType: 'Tablet', brand: 'Apple', model: 'iPad Pro', status: 'eingegangen', createdAt: '2025-05-01' },
];

// Mock-Daten für Kunden
const MOCK_CUSTOMERS = [
  { id: 1, name: 'Max Mustermann', email: 'max.mustermann@example.com', phone: '+49 123 4567890', orders: 3 },
  { id: 2, name: 'Maria Schmidt', email: 'maria.schmidt@example.com', phone: '+49 234 5678901', orders: 1 },
  { id: 3, name: 'Thomas Weber', email: 'thomas.weber@example.com', phone: '+49 345 6789012', orders: 1 },
  { id: 4, name: 'Anna Meier', email: 'anna.meier@example.com', phone: '+49 456 7890123', orders: 1 },
  { id: 5, name: 'Julia Fischer', email: 'julia.fischer@example.com', phone: '+49 567 8901234', orders: 1 },
];

// Mock-Daten für E-Mail-Vorlagen
const MOCK_EMAIL_TEMPLATES = [
  { id: 1, name: 'Reparatur abgeschlossen', subject: 'Ihre Reparatur ist fertig' },
  { id: 2, name: 'Kostenvoranschlag', subject: 'Ihr Kostenvoranschlag' },
  { id: 3, name: 'Feedback-Anfrage', subject: 'Wie war Ihre Erfahrung?' },
  { id: 4, name: 'Teile bestellt', subject: 'Update zu Ihrer Reparatur' },
  { id: 5, name: 'Willkommen', subject: 'Willkommen bei unserer Reparaturwerkstatt' },
];

// Hilfsfunktion für Status-Badges
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

// Komponenten für die verschiedenen Seiten
function DashboardContent() {
  return (
    <div>
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="p-2 rounded-md bg-blue-100 text-blue-700 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Neue Aufträge</p>
              <h3 className="text-xl font-bold">2</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="p-2 rounded-md bg-yellow-100 text-yellow-700 mr-4">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">In Arbeit</p>
              <h3 className="text-xl font-bold">1</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="p-2 rounded-md bg-green-100 text-green-700 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Abgeschlossen</p>
              <h3 className="text-xl font-bold">2</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="p-2 rounded-md bg-purple-100 text-purple-700 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Umsatz (Monat)</p>
              <h3 className="text-xl font-bold">1.450,00 €</h3>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Aktuelle Reparaturen</CardTitle>
            <CardDescription>Die neusten 5 Aufträge</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auftrag</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_REPAIRS.slice(0, 5).map((repair) => (
                  <TableRow key={repair.id}>
                    <TableCell className="font-medium">{repair.orderCode}</TableCell>
                    <TableCell>{repair.customerName}</TableCell>
                    <TableCell>{getStatusBadge(repair.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Statistik</CardTitle>
            <CardDescription>Aufträge der letzten 30 Tage</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart className="mx-auto h-16 w-16 mb-2 text-gray-400" />
              <p>Statistik-Diagramm würde hier angezeigt werden</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RepairsContent() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-white border">
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="new">Neu</TabsTrigger>
            <TabsTrigger value="in_repair">In Arbeit</TabsTrigger>
            <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
          </TabsList>
          
          <div className="flex w-full sm:w-auto space-x-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                className="pl-9 h-9" 
                placeholder="Suche..."
              />
            </div>
            
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          <TabsContent value="all" className="m-0 mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auftragsnr.</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead className="hidden md:table-cell">Gerät</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Erstellt</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_REPAIRS.map((repair) => (
                      <TableRow key={repair.id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell className="font-medium">{repair.orderCode}</TableCell>
                        <TableCell>{repair.customerName}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {repair.deviceType} {repair.brand} {repair.model}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(repair.status)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-500 text-sm">
                          {repair.createdAt}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CustomersContent() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Kundenverwaltung</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Neuer Kunde
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Aufträge</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CUSTOMERS.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.orders}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatisticsContent() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Statistik & Berichte</h2>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" /> Exportieren
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Umsatz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">4.850,00 €</div>
            <p className="text-sm text-gray-500 mt-1">Letzten 30 Tage</p>
            
            <div className="h-[200px] flex items-center justify-center mt-4">
              <div className="text-center text-gray-500">
                <BarChart className="mx-auto h-12 w-12 mb-2 text-gray-400" />
                <p className="text-sm">Umsatzdiagramm würde hier angezeigt werden</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Aufträge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">31</div>
            <p className="text-sm text-gray-500 mt-1">Letzten 30 Tage</p>
            
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Neu</span>
                <span className="text-sm font-medium">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">In Arbeit</span>
                <span className="text-sm font-medium">5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Abgeschlossen</span>
                <span className="text-sm font-medium">18</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Gerätetypen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5</div>
            <p className="text-sm text-gray-500 mt-1">Verschiedene Typen</p>
            
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Smartphone</span>
                <span className="text-sm font-medium">65%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Tablet</span>
                <span className="text-sm font-medium">20%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Laptop</span>
                <span className="text-sm font-medium">15%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmailsContent() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">E-Mail Vorlagen</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Neue Vorlage
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Betreff</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_EMAIL_TEMPLATES.map((template) => (
                <TableRow key={template.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.subject}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsContent() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Einstellungen</h2>
        <Button>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Speichern
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Geschäftsinformationen</CardTitle>
            <CardDescription>Diese Informationen werden auf Ihren Dokumenten angezeigt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Firmenname</label>
                <Input placeholder="Ihre Firma GmbH" defaultValue="Handy Reparatur Plus" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefon</label>
                <Input placeholder="+49 123 456789" defaultValue="+49 30 12345678" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">E-Mail</label>
                <Input placeholder="info@example.com" defaultValue="info@handyreparatur-plus.de" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website</label>
                <Input placeholder="www.example.com" defaultValue="www.handyreparatur-plus.de" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Adresse</label>
              <Input placeholder="Straße und Hausnummer" defaultValue="Hauptstraße 123" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">PLZ</label>
                <Input placeholder="12345" defaultValue="10115" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ort</label>
                <Input placeholder="Stadt" defaultValue="Berlin" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Ihr Firmenlogo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg mb-4">
              <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-gray-400">Logo-Vorschau</span>
              </div>
              <Button variant="outline" size="sm">
                Logo hochladen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DesignPreviewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Seitenleiste - fixiert am linken Rand in dunkler Farbe */}
      <div 
        className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white fixed h-full transition-all duration-300 ease-in-out z-30`}
        style={{ paddingLeft: collapsed ? '0.75rem' : '1.5rem', paddingRight: collapsed ? '0.75rem' : '1.5rem', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
      >
        <div className="mb-8 flex items-center justify-center md:justify-start">
          {collapsed ? (
            <div className="flex justify-center w-full">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold">
                HS
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-bold">HandyShop</h2>
          )}
        </div>
        
        <nav className="space-y-4">
          <div 
            className={`flex items-center p-2 rounded-md ${activePage === 'dashboard' ? 'bg-gray-800 text-blue-400 font-medium' : 'hover:bg-gray-800 text-gray-300'} cursor-pointer`}
            onClick={() => setActivePage('dashboard')}
          >
            <Menu className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">Dashboard</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md ${activePage === 'repairs' ? 'bg-gray-800 text-blue-400 font-medium' : 'hover:bg-gray-800 text-gray-300'} cursor-pointer`}
            onClick={() => setActivePage('repairs')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {!collapsed && <span className="ml-3">Reparaturen</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md ${activePage === 'customers' ? 'bg-gray-800 text-blue-400 font-medium' : 'hover:bg-gray-800 text-gray-300'} cursor-pointer`}
            onClick={() => setActivePage('customers')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {!collapsed && <span className="ml-3">Kunden</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md ${activePage === 'statistics' ? 'bg-gray-800 text-blue-400 font-medium' : 'hover:bg-gray-800 text-gray-300'} cursor-pointer`}
            onClick={() => setActivePage('statistics')}
          >
            <BarChart className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">Statistik</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md ${activePage === 'emails' ? 'bg-gray-800 text-blue-400 font-medium' : 'hover:bg-gray-800 text-gray-300'} cursor-pointer`}
            onClick={() => setActivePage('emails')}
          >
            <Mail className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">E-Mails</span>}
          </div>
          
          <div 
            className={`flex items-center p-2 rounded-md ${activePage === 'settings' ? 'bg-gray-800 text-blue-400 font-medium' : 'hover:bg-gray-800 text-gray-300'} cursor-pointer`}
            onClick={() => setActivePage('settings')}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">Einstellungen</span>}
          </div>
        </nav>
      </div>
      
      {/* Toggle Button für die Seitenleiste */}
      <div 
        className={`fixed z-40 bg-gray-900 text-white rounded-full flex items-center justify-center w-6 h-6 cursor-pointer transition-all duration-300 ease-in-out ${collapsed ? 'left-14' : 'left-60'}`}
        style={{ top: '1.5rem' }} 
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </div>

      {/* Hauptbereich - über gesamte Breite minus Seitenleiste */}
      <div className={`${collapsed ? 'ml-16' : 'ml-64'} flex-1 w-full transition-all duration-300 ease-in-out overflow-auto`}>
        {/* Header - über volle Breite */}
        <div className="p-4 md:p-6 flex justify-between items-center border-b shadow-sm bg-white sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-semibold">Handy Reparatur Dashboard</h1>
            <p className="text-sm text-gray-500">Willkommen zurück</p>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button variant="outline" size="sm" className="hidden md:flex items-center">
              <Plus className="h-4 w-4 mr-2" /> Neue Reparatur
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-800 font-medium">BG</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="bg-gray-50 min-h-[calc(100vh-73px)]">
          {/* Hauptinhalt */}
          <div className="p-4 md:p-6">
            {activePage === 'dashboard' && <DashboardContent />}
            {activePage === 'repairs' && <RepairsContent />}
            {activePage === 'customers' && <CustomersContent />}
            {activePage === 'statistics' && <StatisticsContent />}
            {activePage === 'emails' && <EmailsContent />}
            {activePage === 'settings' && <SettingsContent />}
          </div>
        </div>
      </div>
    </div>
  );
}