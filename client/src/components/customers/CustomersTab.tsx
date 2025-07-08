import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Customer, Repair } from '@shared/schema';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import { NewCustomerDialog } from './NewCustomerDialog';

import { Plus, Search } from 'lucide-react';

interface CustomersTabProps {
  onNewOrder: (customerId?: number) => void;
  onNewCustomer?: () => void; // Optionaler Handler für das Hinzufügen eines neuen Kunden
}

export function CustomersTab({ onNewOrder, onNewCustomer }: CustomersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers']
  });

  const { data: repairs, isLoading: repairsLoading } = useQuery<Repair[]>({
    queryKey: ['/api/repairs']
  });

  const customerWithRepairs = useMemo(() => {
    if (!customers || !repairs) return [];

    return customers
      .filter(customer => {
        if (!searchTerm) return true;
        
        const searchValue = searchTerm.toLowerCase();
        return (
          customer.firstName.toLowerCase().includes(searchValue) ||
          customer.lastName.toLowerCase().includes(searchValue) ||
          customer.phone.includes(searchValue) ||
          (customer.email && customer.email.toLowerCase().includes(searchValue))
        );
      })
      .map(customer => {
        const customerRepairs = repairs.filter(r => r.customerId === customer.id);
        const orderCount = customerRepairs.length;
        let lastOrderDate = null;
        
        if (orderCount > 0) {
          const sortedRepairs = [...customerRepairs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          lastOrderDate = sortedRepairs[0].createdAt;
        }
        
        return {
          ...customer,
          orderCount,
          lastOrderDate
        };
      })
      .sort((a, b) => {
        // Priorität 1: Neue Kunden ohne Aufträge (kürzlich erstellt) - ganz oben
        if (a.orderCount === 0 && b.orderCount === 0) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        // Priorität 2: Neue Kunden ohne Aufträge vor Kunden mit Aufträgen
        if (a.orderCount === 0 && b.orderCount > 0) {
          return -1; // a (neuer Kunde) kommt vor b
        }
        if (a.orderCount > 0 && b.orderCount === 0) {
          return 1; // b (neuer Kunde) kommt vor a
        }
        
        // Priorität 3: Kunden mit Aufträgen nach letztem Auftragsdatum sortieren
        if (a.lastOrderDate && b.lastOrderDate) {
          return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        }
        if (a.lastOrderDate) return -1;
        if (b.lastOrderDate) return 1;
        return 0;
      });
  }, [customers, repairs, searchTerm]);

  // Paginierung der Kundenliste
  const totalPages = Math.ceil(customerWithRepairs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = customerWithRepairs.slice(startIndex, endIndex);

  // Reset page when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Event handlers
  const handleCustomerClick = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setIsCustomerDetailOpen(true);
  };

  const handleCustomerDetailClose = () => {
    setIsCustomerDetailOpen(false);
  };

  const handleNewRepairForCustomer = (customerId: number) => {
    console.log("CustomersTab: handleNewRepairForCustomer aufgerufen mit customerId:", customerId);
    onNewOrder(customerId); // Customer ID an den Parent-Handler übergeben
  };
  
  const handleOpenNewCustomerDialog = () => {
    setIsNewCustomerDialogOpen(true);
  };
  
  const handleCloseNewCustomerDialog = () => {
    setIsNewCustomerDialogOpen(false);
  };
  
  const handleCustomerCreated = (customerId: number) => {
    // Optional: Hier könnte man nach Erstellung des Kunden direkt den Kundendetaildialog öffnen
    // setSelectedCustomerId(customerId);
    // setIsCustomerDetailOpen(true);
    
    // Oder einen externen Handler aufrufen, falls vorhanden
    if (onNewCustomer) {
      onNewCustomer();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center p-6">
        <h2 className="text-xl font-semibold text-primary">Kundenübersicht</h2>
        <Button
          onClick={handleOpenNewCustomerDialog}
          variant="default"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Neuer Kunde
        </Button>
      </div>
      
      <div className="px-6 pb-4">
        <div className="relative w-full sm:w-64">
          <Input
            type="text"
            placeholder="Kunden suchen..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pr-10"
          />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      <div className="px-6 pb-6">
        {/* Desktop-Tabellenansicht (versteckt auf mobilen Geräten) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-primary text-white">
                <th className="py-3 px-4 text-left">Vorname</th>
                <th className="py-3 px-4 text-left">Nachname</th>
                <th className="py-3 px-4 text-left">Telefon</th>
                <th className="py-3 px-4 text-left">Email</th>
                <th className="py-3 px-4 text-left">Anzahl Aufträge</th>
                <th className="py-3 px-4 text-left">Letzter Auftrag</th>
              </tr>
            </thead>
            <tbody>
              {customersLoading || repairsLoading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">Lädt Daten...</td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">Keine Kunden gefunden</td>
                </tr>
              ) : (
                paginatedCustomers.map(customer => {
                  const isNewCustomer = customer.orderCount === 0;
                  return (
                    <tr 
                      key={customer.id} 
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-all cursor-pointer ${
                        isNewCustomer ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                      }`}
                      onClick={() => handleCustomerClick(customer.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {customer.firstName}
                          {isNewCustomer && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                              NEU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{customer.lastName}</td>
                      <td className="py-3 px-4">{customer.phone}</td>
                      <td className="py-3 px-4">{customer.email || '-'}</td>
                      <td className="py-3 px-4">{customer.orderCount}</td>
                      <td className="py-3 px-4">
                        {customer.lastOrderDate 
                          ? new Date(customer.lastOrderDate).toLocaleDateString('de-DE') 
                          : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Karten-Ansicht (nur auf kleineren Bildschirmen anzeigen) */}
        <div className="md:hidden space-y-2">
          {customersLoading || repairsLoading ? (
            <div className="p-4 text-center text-gray-500">Lädt Daten...</div>
          ) : paginatedCustomers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Keine Kunden gefunden</div>
          ) : (
            paginatedCustomers.map(customer => {
              const isNewCustomer = customer.orderCount === 0;
              return (
                <div 
                  key={customer.id} 
                  className={`bg-white rounded-lg shadow border overflow-hidden cursor-pointer ${
                    isNewCustomer ? 'border-green-500 border-l-4' : 'border-gray-200'
                  }`}
                  onClick={() => handleCustomerClick(customer.id)}
                >
                  <div className={`flex justify-between items-center p-3 border-b border-gray-200 ${
                    isNewCustomer ? 'bg-green-50' : 'bg-gray-50'
                  }`}>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {customer.firstName} {customer.lastName}
                      {isNewCustomer && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          NEU
                        </span>
                      )}
                    </div>
                    <div className={`text-xs rounded px-2 py-1 ${
                      isNewCustomer ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {customer.orderCount} Aufträge
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <div className="p-3 flex justify-between">
                      <span className="text-xs text-gray-500">Telefon</span>
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="p-3 flex justify-between">
                        <span className="text-xs text-gray-500">Email</span>
                        <span className="text-sm">{customer.email}</span>
                      </div>
                    )}
                    <div className="p-3 flex justify-between">
                      <span className="text-xs text-gray-500">Letzter Auftrag</span>
                      <span className="text-sm font-medium">
                        {customer.lastOrderDate 
                          ? new Date(customer.lastOrderDate).toLocaleDateString('de-DE') 
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Paginierung */}
        {customerWithRepairs.length > itemsPerPage && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Zeige {startIndex + 1} von {customerWithRepairs.length} Einträgen
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                  ‹
                </button>
                <span className="text-sm text-gray-700">
                  Seite {currentPage} von {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        open={isCustomerDetailOpen}
        onClose={handleCustomerDetailClose}
        customerId={selectedCustomerId}
        onNewOrder={handleNewRepairForCustomer}
      />

      {/* New Customer Dialog */}
      <NewCustomerDialog
        open={isNewCustomerDialogOpen}
        onClose={handleCloseNewCustomerDialog}
        onCustomerCreated={handleCustomerCreated}
      />

    </div>
  );
}
