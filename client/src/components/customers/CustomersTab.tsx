import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Customer, Repair } from '@/lib/types';

interface CustomersTabProps {
  onNewOrder: () => void;
}

export function CustomersTab({ onNewOrder }: CustomersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

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
        // Sort by last order date (most recent first)
        if (a.lastOrderDate && b.lastOrderDate) {
          return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        }
        if (a.lastOrderDate) return -1;
        if (b.lastOrderDate) return 1;
        return 0;
      });
  }, [customers, repairs, searchTerm]);

  return (
    <div>
      <div className="flex justify-between items-center p-6">
        <h2 className="text-xl font-semibold">Kundenübersicht</h2>
        <Button
          onClick={onNewOrder}
          className="bg-white text-primary hover:bg-gray-100 shadow flex items-center gap-2 font-semibold transition-all transform hover:-translate-y-1"
        >
          <span>➕</span> Neuer Auftrag
        </Button>
      </div>
      
      <div className="px-6 pb-4">
        <div className="relative w-full sm:w-64">
          <Input
            type="text"
            placeholder="Kunden suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
          <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>
      
      <div className="px-6 pb-6">
        <div className="overflow-x-auto">
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
              ) : customerWithRepairs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500">Keine Kunden gefunden</td>
                </tr>
              ) : (
                customerWithRepairs.map(customer => (
                  <tr key={customer.id} className="border-b border-gray-200 hover:bg-blue-50 transition-all">
                    <td className="py-3 px-4">{customer.firstName}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
