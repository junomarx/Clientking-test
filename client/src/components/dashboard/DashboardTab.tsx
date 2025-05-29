import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Customer } from '@shared/schema';
import { Repair } from '@/lib/types';
import { useLocation } from 'wouter';
import { getStatusBadge } from '@/lib/utils';
import { 
  Printer, 
  ShoppingBag, 
  TrendingUp, 
  Wrench as Tool,
  Clock,
  CheckCircle
} from 'lucide-react';
import { usePrintManager } from '@/components/repairs/PrintOptionsManager';
import { AnimatedStatCard } from './AnimatedStatCard';
import { RepairStatusChart } from './RepairStatusChart';
import { AnimatedRecentOrders } from './AnimatedRecentOrders';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/queryClient';
import { EditRepairDialog } from '@/components/repairs/EditRepairDialog';
import { ChangeStatusDialog } from '../repairs/ChangeStatusDialog';
import { BusinessDataAlert } from '@/components/common/BusinessDataAlert';

interface DashboardTabProps {
  onNewOrder: () => void;
  onTabChange?: (tab: 'dashboard' | 'repairs' | 'customers') => void;
}

export function DashboardTab({ onNewOrder, onTabChange }: DashboardTabProps) {
  // Statt zu einer neuen Seite zu navigieren, wechseln wir zum Repairs-Tab
  // und setzen den Status-Filter über URL-Parameter
  const [, setLocation] = useLocation();
  
  // State für Status- und Bearbeitungsdialoge
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  
  // QueryClient für Cache-Invalidierung
  const queryClient = useQueryClient();
  
  // PrintManager für Druckoptionen
  const { showPrintOptions } = usePrintManager();

  // Status-Änderung Mutation
  const updateStatusMutation = useMutation<any, Error, { id: number; status: string }>({
    mutationFn: async (variables) => {
      const response = await apiRequest(
        'PATCH',
        `/api/repairs/${variables.id}/status`,
        { status: variables.status }
      );
      return response.json();
    },
    onSuccess: () => {
      // Aktualisiere die Reparaturen und Statistiken
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Schließe den Dialog
      setShowStatusDialog(false);
    }
  });
  
  // Handler für Status-Änderung öffnen
  const openStatusDialog = (id: number, status: string) => {
    setSelectedRepairId(id);
    setCurrentStatus(status);
    setShowStatusDialog(true);
  };
  
  // Handler für Bearbeiten öffnen
  const handleEdit = (id: number) => {
    setSelectedRepairId(id);
    setShowEditDialog(true);
  };
  
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
    
    // Definiere einen Typ, der mit der Interface-Definition von AnimatedRecentOrders übereinstimmt
    type DashboardRepair = {
      id: number;
      orderCode?: string | null;
      customerName: string;
      model: string;
      status: string;
      createdAt: string;
    };
    
    return repairs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(repair => {
        const customer = customers.find(c => c.id === repair.customerId);
        const dashboardRepair: DashboardRepair = {
          id: repair.id,
          orderCode: repair.orderCode,
          customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
          model: repair.model,
          status: repair.status,
          createdAt: repair.createdAt.toString()
        };
        return dashboardRepair;
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
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Alert für unvollständige Geschäftsdaten */}
      <BusinessDataAlert onTabChange={onTabChange} />
      
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Übersicht Ihrer Reparaturen und aktuellen Statistiken</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={onNewOrder}
            className="bg-primary text-white shadow-md flex items-center gap-2 font-medium"
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
      
      {/* Statistik-Karten im Superadmin-Stil */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={() => navigateToFilteredRepairs('all')}
          className="cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="rounded-lg overflow-hidden shadow-sm border">
            <div className="bg-blue-500 text-white rounded-t-lg px-4 py-2">
              <h3 className="text-sm font-medium">Gesamte Aufträge</h3>
            </div>
            <div className="p-4 bg-white flex justify-between items-center">
              <p className="text-2xl font-bold">{statsLoading ? 0 : stats?.totalOrders || 0}</p>
              <div className="bg-blue-100 p-2 rounded-full text-blue-500">
                <ShoppingBag size={20} />
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          onClick={() => navigateToFilteredRepairs('in_reparatur')}
          className="cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="rounded-lg overflow-hidden shadow-sm border">
            <div className="bg-amber-500 text-white rounded-t-lg px-4 py-2">
              <h3 className="text-sm font-medium">In Reparatur</h3>
            </div>
            <div className="p-4 bg-white flex justify-between items-center">
              <p className="text-2xl font-bold">{statsLoading ? 0 : stats?.inRepair || 0}</p>
              <div className="bg-amber-100 p-2 rounded-full text-amber-500">
                <Tool size={20} />
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          onClick={() => navigateToFilteredRepairs('fertig')}
          className="cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="rounded-lg overflow-hidden shadow-sm border">
            <div className="bg-green-500 text-white rounded-t-lg px-4 py-2">
              <h3 className="text-sm font-medium">Fertig zur Abholung</h3>
            </div>
            <div className="p-4 bg-white flex justify-between items-center">
              <p className="text-2xl font-bold">{statsLoading ? 0 : stats?.readyForPickup || 0}</p>
              <div className="bg-green-100 p-2 rounded-full text-green-500">
                <Clock size={20} />
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          onClick={() => navigateToFilteredRepairs('abgeholt')}
          className="cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="rounded-lg overflow-hidden shadow-sm border">
            <div className="bg-green-600 text-white rounded-t-lg px-4 py-2">
              <h3 className="text-sm font-medium">Abgeschlossen</h3>
            </div>
            <div className="p-4 bg-white flex justify-between items-center">
              <p className="text-2xl font-bold">{statsLoading ? 0 : stats?.completed || 0}</p>
              <div className="bg-green-100 p-2 rounded-full text-green-600">
                <CheckCircle size={20} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="rounded-lg overflow-hidden shadow-sm border"
      >
        <div className="border-b px-4 py-3 bg-white">
          <h2 className="font-semibold">Aktuelle Reparaturen</h2>
          <p className="text-sm text-muted-foreground">Die neuesten Reparaturaufträge</p>
        </div>
        <div className="bg-white">
          <AnimatedRecentOrders 
            repairs={recentRepairs}
            isLoading={repairsLoading || customersLoading}
            onPrintClick={showPrintOptions}
            onStatusChange={openStatusDialog}
            onEdit={handleEdit}
          />
        </div>
      </motion.div>

      {/* Status-Änderungsdialog */}
      <ChangeStatusDialog
        open={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        repairId={selectedRepairId}
        currentStatus={currentStatus}
        onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
      />

      {/* Repair bearbeiten Dialog */}
      {repairs && selectedRepairId && (
        <EditRepairDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          repair={repairs.find(r => r.id === selectedRepairId) as any || null}
        />
      )}
    </motion.div>
  );
}
