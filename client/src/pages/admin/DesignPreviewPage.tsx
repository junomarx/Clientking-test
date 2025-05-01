import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ArrowDownWideNarrow, Settings, Check, PhoneCall, AlertCircle, ChevronLeft, ChevronRight, Menu, Pencil, Printer, Trash2, Mail, Star, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Repair as SchemaRepair, Customer } from '@shared/schema';
import { Repair } from '@/lib/types';
import { getStatusBadge } from '@/lib/utils';

// Leeres Array für den Fall, dass keine Daten vorhanden sind
const fallbackData: any[] = [];

export default function DesignPreviewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  
  // Echte Daten aus der API abrufen
  const { data: repairsData = fallbackData, isLoading } = useQuery<SchemaRepair[]>({
    queryKey: ['/api/repairs'],
  });
  
  // Kunden abrufen
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });
  
  // Konvertieren und Aufbereiten der Reparaturdaten für die Anzeige
  const repairs = useMemo(() => {
    return repairsData.map(repair => {
      const customer = customers.find(c => c.id === repair.customerId);
      return {
        id: repair.id,
        orderCode: repair.orderCode,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unbekannt',
        customerPhone: customer?.phone || '',
        deviceType: repair.deviceType,
        brand: repair.brand || '',
        model: repair.model || '',
        problem: repair.problem || '',
        status: repair.status,
        createdAt: repair.createdAt,
        updatedAt: repair.updatedAt,
        price: repair.price,
        notes: repair.notes || '',
        customerId: repair.customerId
      } as Repair;
    });
  }, [repairsData, customers]);
  
  // Gefilterte Reparaturen basierend auf Status und Suchbegriff
  const filteredRepairs = useMemo(() => {
    return repairs.filter(repair => {
      const matchesSearch = searchTerm === '' ||
        repair.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.deviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repair.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || repair.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [repairs, searchTerm, statusFilter]);

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
          <div className="flex items-center p-2 rounded-md bg-gray-800 text-blue-400 font-medium">
            <Menu className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">Dashboard</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {!collapsed && <span className="ml-3">Reparaturen</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {!collapsed && <span className="ml-3">Kunden</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            {!collapsed && <span className="ml-3">Statistik</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            {!collapsed && <span className="ml-3">E-Mails</span>}
          </div>
          
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
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
          {/* Hauptinhalt mit Tabs */}
          <div className="p-4 md:p-6">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <TabsList className="bg-white border">
                  <TabsTrigger value="all" onClick={() => setStatusFilter('all')}>Alle</TabsTrigger>
                  <TabsTrigger value="new" onClick={() => setStatusFilter('new')}>Neu</TabsTrigger>
                  <TabsTrigger value="in_repair" onClick={() => setStatusFilter('in_repair')}>In Arbeit</TabsTrigger>
                  <TabsTrigger value="completed" onClick={() => setStatusFilter('completed')}>Abgeschlossen</TabsTrigger>
                </TabsList>
                
                <div className="flex w-full sm:w-auto space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input 
                      className="pl-9 h-9" 
                      placeholder="Suche..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value="all" className="m-0">
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
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10">Daten werden geladen...</TableCell>
                          </TableRow>
                        ) : filteredRepairs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10">Keine Reparaturen vorhanden</TableCell>
                          </TableRow>
                        ) : (
                          filteredRepairs.map((repair) => (
                            <TableRow key={repair.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedRepair(repair)}>
                              <TableCell className="font-medium">{repair.orderCode}</TableCell>
                              <TableCell>{repair.customerName}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {repair.deviceType} {repair.brand} {repair.model}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(repair.status)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-gray-500 text-sm">
                                {new Date(repair.createdAt).toLocaleDateString('de-DE')}
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
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="new" className="m-0">
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
                        {filteredRepairs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10">Keine neuen Reparaturen vorhanden</TableCell>
                          </TableRow>
                        ) : (
                          filteredRepairs.map((repair) => (
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
                                {new Date(repair.createdAt).toLocaleDateString('de-DE')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="in_repair" className="m-0">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Auftragsnr.</TableHead>
                          <TableHead>Kunde</TableHead>
                          <TableHead className="hidden md:table-cell">Gerät</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Aktualisiert</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRepairs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10">Keine Reparaturen in Arbeit</TableCell>
                          </TableRow>
                        ) : (
                          filteredRepairs.map((repair) => (
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
                                {new Date(repair.updatedAt).toLocaleDateString('de-DE')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <PhoneCall className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="completed" className="m-0">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Auftragsnr.</TableHead>
                          <TableHead>Kunde</TableHead>
                          <TableHead className="hidden md:table-cell">Gerät</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Abgeschlossen</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRepairs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-10">Keine abgeschlossenen Reparaturen</TableCell>
                          </TableRow>
                        ) : (
                          filteredRepairs.map((repair) => (
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
                                {new Date(repair.updatedAt).toLocaleDateString('de-DE')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Star className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
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
                    <h3 className="text-xl font-bold">{repairs.filter(r => r.status === 'new').length}</h3>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 flex items-center">
                  <div className="p-2 rounded-md bg-yellow-100 text-yellow-700 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">In Arbeit</p>
                    <h3 className="text-xl font-bold">{repairs.filter(r => r.status === 'in_repair').length}</h3>
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
                    <h3 className="text-xl font-bold">{repairs.filter(r => r.status === 'completed').length}</h3>
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
                    <h3 className="text-xl font-bold">
                      {repairs
                        .filter(r => r.status === 'completed' && r.price)
                        .reduce((sum, repair) => sum + (repair.price || 0), 0)
                        .toFixed(2)}
                      €
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
