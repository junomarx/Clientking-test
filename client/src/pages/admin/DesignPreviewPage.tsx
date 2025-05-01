import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ArrowDownWideNarrow, Settings, Check, PhoneCall, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Repair } from '@shared/schema';

// Leeres Array für den Fall, dass keine Daten vorhanden sind
const fallbackData: any[] = [];

export default function DesignPreviewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('datum');
  
  // Echte Daten aus der API abrufen
  const { data: repairs = fallbackData, isLoading } = useQuery<Repair[]>({
    queryKey: ['/api/repairs'],
  });
  
  return (
    <div className="flex h-screen">
      {/* Seitenleiste - fixiert am linken Rand in dunkler Farbe */}
      <div className="w-64 bg-gray-900 text-white fixed h-full p-6">
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">YOURLOGO</h2>
        </div>
        
        <nav className="space-y-4">
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-blue-400 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
            </svg>
            Dashboard
          </div>
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            Übersicht
          </div>
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Reparaturen
          </div>
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Kunden
          </div>
          <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            Statistik
          </div>
        </nav>
      </div>
      
      {/* Hauptbereich - über gesamte Breite minus Seitenleiste */}
      <div className="ml-64 flex-1 bg-white text-gray-800 w-full">
        {/* Header - über volle Breite */}
        <div className="p-6 flex justify-between items-center border-b shadow-sm bg-white">
          <div>
            <h1 className="text-xl font-semibold">Hallo, Bugi</h1>
            <p className="text-sm text-gray-500">Haben einen schönen Tag</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600">BG</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Content - volle Breite mit Padding */}
        <div className="bg-gray-50 min-h-screen">
          {/* Farbiger Abschnitt unter Header */}
          <div className="bg-gray-100 border-b p-6">
            <div className="container mx-auto">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Reparaturen und Kunden</h2>
              <p className="text-gray-600">Verwalten Sie Ihre Reparaturaufträge und Kundendaten effizient</p>
            </div>
          </div>
          
          {/* Hauptinhalt */}
          <div className="p-6 container mx-auto">
          
            {/* Search and Filter */}
            <div className="mb-6 flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input 
                  className="pl-10 pr-4 py-2" 
                  placeholder="Suche nach Auftragsnummer, Kunde oder Gerät"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex space-x-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[200px] flex items-center">
                    <ArrowDownWideNarrow className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sortieren nach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="datum">Datum</SelectItem>
                    <SelectItem value="kunde">Kundenname</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
              </div>
            </div>
            
            {/* Repair List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Reparaturliste</CardTitle>
                <p className="text-sm text-gray-500">
                  {repairs.length} Reparaturen insgesamt
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auftragsnr.</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Gerät</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead className="text-right">Preis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Daten werden geladen...</TableCell>
                      </TableRow>
                    ) : repairs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Keine Reparaturen vorhanden</TableCell>
                      </TableRow>
                    ) : (
                      repairs.slice(0, 5).map((repair) => (
                        <TableRow key={repair.id}>
                          <TableCell className="font-medium">{repair.orderCode}</TableCell>
                          <TableCell>{repair.customerName}</TableCell>
                          <TableCell>{repair.deviceType} {repair.brand} {repair.model}</TableCell>
                          <TableCell>
                            <span 
                              className={`px-2 py-1 rounded-full text-xs ${repair.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : repair.status === 'in_repair' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'}`}
                            >
                              {repair.status === 'completed' 
                                ? 'Abgeschlossen' 
                                : repair.status === 'in_repair' 
                                  ? 'In Arbeit' 
                                  : 'Neu'}
                            </span>
                          </TableCell>
                          <TableCell>{repair.customerPhone || '-'}</TableCell>
                          <TableCell className="text-right">{repair.price ? `${repair.price}€` : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Metrics and Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ziele</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Effizienz der Abwicklung</Label>
                      <div>85%</div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Kundenzufriedenheit</Label>
                      <div>92%</div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Umsatz diesen Monat</Label>
                      <div>14.356€</div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Notizen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-md">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Neue Ersatzteile bestellen</h4>
                      <p className="text-sm text-gray-500">Samsung Galaxy Displays und iPhone Akkus</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-3 rounded-md">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Team Meeting</h4>
                      <p className="text-sm text-gray-500">Morgen um 10:00 Uhr</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Aktivitäten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 text-green-800 rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                      <div className="text-sm">iPhone 13 Display repariert</div>
                      <div className="text-xs text-gray-500 ml-auto">vor 2h</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 text-blue-800 rounded-full p-1">
                        <PhoneCall className="h-4 w-4" />
                      </div>
                      <div className="text-sm">Kunde angerufen</div>
                      <div className="text-xs text-gray-500 ml-auto">vor 4h</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-yellow-100 text-yellow-800 rounded-full p-1">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div className="text-sm">Neue Anfrage erhalten</div>
                      <div className="text-xs text-gray-500 ml-auto">vor 5h</div>
                    </div>
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