import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Repair, Customer } from '@shared/schema';
import { useLocation } from 'wouter';
import { getStatusBadge } from '@/lib/utils';
import { 
  Printer, 
  ShoppingBag, 
  TrendingUp, 
  Wrench as Tool,
  Clock
} from 'lucide-react';
import { usePrintManager } from '@/components/repairs/PrintOptionsManager';
import { AnimatedStatCard } from './AnimatedStatCard';
import { RepairStatusChart } from './RepairStatusChart';
import { AnimatedRecentOrders } from './AnimatedRecentOrders';
import { motion } from 'framer-motion';

interface DashboardTabProps {
  onNewOrder: () => void;
  onTabChange?: (tab: 'dashboard' | 'repairs' | 'customers') => void;
}

export function DashboardTab({ onNewOrder, onTabChange }: DashboardTabProps) {
  // Statt zu einer neuen Seite zu navigieren, wechseln wir zum Repairs-Tab
  // und setzen den Status-Filter über URL-Parameter
  const [, setLocation] = useLocation();
  
  // PrintManager für Druckoptionen
  const { showPrintOptions } = usePrintManager();
  
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

  // Get the most recent 5 repairs with customer names for the animated table
  const recentRepairs = React.useMemo(() => {
    if (!repairs || !customers) return [];
    
    return repairs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(repair => {
        const customer = customers.find(c => c.id === repair.customerId);
        return {
          id: repair.id,
          orderCode: repair.orderCode,
          customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
          model: repair.model,
          status: repair.status,
          createdAt: repair.createdAt.toString()
        };
      });
  }, [repairs, customers]);

  // Container-Animations-Varianten
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  return (
    <motion.div
      className="p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="flex justify-between items-center p-4 mb-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
          Dashboard
        </h2>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={onNewOrder}
            className="bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg flex items-center gap-2 font-semibold"
          >
            <motion.span 
              animate={{ rotate: [0, 0, 180, 180, 0], scale: [1, 1.3, 1.3, 1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 5 }}
            >
              ➕
            </motion.span> 
            Neuer Auftrag
          </Button>
        </motion.div>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <AnimatedStatCard 
          title="Gesamte Aufträge" 
          value={statsLoading ? 0 : stats?.totalOrders || 0} 
          type="primary" 
          onClick={() => navigateToFilteredRepairs('all')}
          icon={<ShoppingBag size={24} />}
        />
        <AnimatedStatCard 
          title="In Reparatur" 
          value={statsLoading ? 0 : stats?.inRepair || 0} 
          type="warning" 
          onClick={() => navigateToFilteredRepairs('in_reparatur')}
          icon={<Tool size={24} />}
        />
        <AnimatedStatCard 
          title="Fertig zur Abholung" 
          value={statsLoading ? 0 : stats?.readyForPickup || 0} 
          type="success" 
          onClick={() => navigateToFilteredRepairs('fertig')}
          icon={<Clock size={24} />}
        />
        <AnimatedStatCard 
          title="Außer Haus" 
          value={statsLoading ? 0 : stats?.outsourced || 0} 
          type="info" 
          onClick={() => navigateToFilteredRepairs('ausser_haus')}
          icon={<TrendingUp size={24} />}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <AnimatedRecentOrders 
            repairs={recentRepairs}
            isLoading={repairsLoading || customersLoading}
            onPrintClick={showPrintOptions}
          />
        </div>
        <div>
          {!statsLoading && stats && (
            <RepairStatusChart stats={stats} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
