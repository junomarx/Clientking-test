import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from './StatCard';
import { Button } from '@/components/ui/button';
import { Repair, Customer } from '@/lib/types';
import { getStatusBadge } from '@/lib/utils/statusBadges';

interface DashboardTabProps {
  onNewOrder: () => void;
}

export function DashboardTab({ onNewOrder }: DashboardTabProps) {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalOrders: number;
    inRepair: number;
    completed: number;
    today: number;
  }>({
    queryKey: ['/api/stats']
  });

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
        <StatCard 
          title="Gesamte Aufträge" 
          value={statsLoading ? 0 : stats?.totalOrders || 0} 
          type="primary" 
        />
        <StatCard 
          title="In Reparatur" 
          value={statsLoading ? 0 : stats?.inRepair || 0} 
          type="warning" 
        />
        <StatCard 
          title="Fertiggestellte Reparaturen" 
          value={statsLoading ? 0 : stats?.completed || 0} 
          type="success" 
        />
        <StatCard 
          title="Heute erfasst" 
          value={statsLoading ? 0 : stats?.today || 0} 
          type="info" 
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
