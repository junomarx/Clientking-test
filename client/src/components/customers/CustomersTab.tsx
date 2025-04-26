import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Customer, Repair } from '@shared/schema';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import { NewRepairModal } from '../repairs/NewRepairModal';
import { Plus, Search } from 'lucide-react';

interface CustomersTabProps {
  onNewOrder: () => void;
}

export function CustomersTab({ onNewOrder }: CustomersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  const [isNewRepairOpen, setIsNewRepairOpen] = useState(false);

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

  // Event handlers
  const handleCustomerClick = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setIsCustomerDetailOpen(true);
  };

  const handleCustomerDetailClose = () => {
    setIsCustomerDetailOpen(false);
  };

  const handleNewRepairForCustomer = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setIsNewRepairOpen(true);
  };

  const handleNewRepairClose = () => {
    setIsNewRepairOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center p-6">
        <h2 className="text-xl font-semibold text-primary">Kundenübersicht</h2>
        <Button
          onClick={onNewOrder}
          variant="default"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Neuer Auftrag
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
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
                  <tr 
                    key={customer.id} 
                    className="border-b border-gray-200 hover:bg-blue-50 transition-all cursor-pointer"
                    onClick={() => handleCustomerClick(customer.id)}
                  >
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

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        open={isCustomerDetailOpen}
        onClose={handleCustomerDetailClose}
        customerId={selectedCustomerId}
        onNewOrder={handleNewRepairForCustomer}
      />

      {/* New Repair Modal for Customer */}
      <NewRepairModal
        open={isNewRepairOpen}
        onClose={handleNewRepairClose}
        customerId={selectedCustomerId}
      />
    </div>
  );
}
