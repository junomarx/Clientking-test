import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from './StatCard';
import { Button } from '@/components/ui/button';
import { Repair, Customer } from '@shared/schema';
import { getStatusBadge } from '@/lib/utils';
import { useLocation } from 'wouter';

interface DashboardTabProps {
  onNewOrder: () => void;
  onTabChange?: (tab: 'dashboard' | 'repairs' | 'customers') => void;
}

export function DashboardTab({ onNewOrder, onTabChange }: DashboardTabProps) {
  // Statt zu einer neuen Seite zu navigieren, wechseln wir zum Repairs-Tab
  // und setzen den Status-Filter über URL-Parameter
  const [, setLocation] = useLocation();
  
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalOrders: number;
    inRepair: number;
    completed: number;
    today: number;
    readyForPickup: number;
    outsourced: number;
  }>({
    queryKey: ['/api/stats']
  });
  
  // Handler functions for status filtering
  const navigateToFilteredRepairs = (status: string) => {
    // Setze den URL-Parameter, ohne die Seite zu wechseln
    const currentUrl = window.location.pathname;
    const newUrl = `${currentUrl}?status=${status}`;
    window.history.pushState({}, '', newUrl);
    
    // Wechsle zum Repairs-Tab
    if (onTabChange) {
      onTabChange('repairs');
    }
  };

  const { data: repairs, isLoading: repairsLoading } = useQuery<Repair[]>({
    queryKey: ['/api/repairs']
  });

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers']
  });

  // Get the most recent 5 repairs
  const recentRepairs = React.useMemo(() => {
    if (!repairs || !customers) return [];
    
    return repairs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(repair => {
        const customer = customers.find(c => c.id === repair.customerId);
        return {
          ...repair,
          customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'
        };
      });
  }, [repairs, customers]);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center p-6">
        <h2 className="text-xl font-semibold">Übersicht</h2>
        <Button
          onClick={onNewOrder}
          className="bg-white text-primary hover:bg-gray-100 shadow flex items-center gap-2 font-semibold transition-all transform hover:-translate-y-1"
        >
          <span>➕</span> Neuer Auftrag
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6">
        <StatCard 
          title="Gesamte Aufträge" 
          value={statsLoading ? 0 : stats?.totalOrders || 0} 
          type="primary" 
          onClick={() => navigateToFilteredRepairs('all')}
        />
        <StatCard 
          title="In Reparatur" 
          value={statsLoading ? 0 : stats?.inRepair || 0} 
          type="warning" 
          onClick={() => navigateToFilteredRepairs('in_reparatur')}
        />
        <StatCard 
          title="Außer Haus" 
          value={statsLoading ? 0 : stats?.outsourced || 0} 
          type="info" 
          onClick={() => navigateToFilteredRepairs('ausser_haus')}
        />
        <StatCard 
          title="Fertig zur Abholung" 
          value={statsLoading ? 0 : stats?.readyForPickup || 0} 
          type="success" 
          onClick={() => navigateToFilteredRepairs('fertig')}
        />
        <StatCard 
          title="Abgeholt" 
          value={statsLoading ? 0 : (stats?.completed || 0) - (stats?.readyForPickup || 0)} 
          type="success" 
          onClick={() => navigateToFilteredRepairs('abgeholt')}
        />
        <StatCard 
          title="Heute erfasst" 
          value={statsLoading ? 0 : stats?.today || 0} 
          type="primary"
          onClick={() => navigateToFilteredRepairs('today')} 
        />
      </div>
      
      <div className="p-6">
        <h3 className="font-semibold mb-4 text-lg">Neueste Aufträge</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-primary text-white">
                <th className="py-3 px-4 text-left">Nr</th>
                <th className="py-3 px-4 text-left">Kunde</th>
                <th className="py-3 px-4 text-left">Gerät</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Datum</th>
              </tr>
            </thead>
            <tbody>
              {repairsLoading || customersLoading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">Lädt Daten...</td>
                </tr>
              ) : recentRepairs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">Keine Reparaturen vorhanden</td>
                </tr>
              ) : (
                recentRepairs.map(repair => (
                  <tr key={repair.id} className="border-b border-gray-200 hover:bg-blue-50 transition-all">
                    <td className="py-3 px-4">#{repair.id}</td>
                    <td className="py-3 px-4">{repair.customerName}</td>
                    <td className="py-3 px-4">{repair.model}</td>
                    <td className="py-3 px-4">
                      {getStatusBadge(repair.status)}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(repair.createdAt).toLocaleDateString('de-DE')}
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
