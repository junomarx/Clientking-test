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
  CheckCircle,
  FileText,
  Download,
  Smartphone
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
import { QRSignatureDialog } from '@/components/signature/QRSignatureDialog';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';



interface DashboardTabProps {
  onNewOrder: () => void;
  onTabChange?: (tab: 'dashboard' | 'repairs' | 'customers') => void;
}

export function DashboardTab({ onNewOrder, onTabChange }: DashboardTabProps) {
  // Statt zu einer neuen Seite zu navigieren, wechseln wir zum Repairs-Tab
  // und setzen den Status-Filter über URL-Parameter
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State für Status- und Bearbeitungsdialoge
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  
  // State für QR-Unterschrift
  const [showQRSignatureDialog, setShowQRSignatureDialog] = useState(false);
  const [selectedRepairForSignature, setSelectedRepairForSignature] = useState<any>(null);
  
  // State für Leihgeräte-Warning
  const [showLoanerWarning, setShowLoanerWarning] = useState(false);
  const [selectedLoanerDevice, setSelectedLoanerDevice] = useState<any>(null);
  const [warningRepairId, setWarningRepairId] = useState<number | null>(null);
  

  

  
  // QueryClient für Cache-Invalidierung
  const queryClient = useQueryClient();
  
  // PrintManager für Druckoptionen
  const { showPrintOptions } = usePrintManager();
  
  // Business Settings für QR-Code Unterschriften
  const { settings: businessSettingsData } = useBusinessSettings();

  // Mutation für das Zurückgeben von Leihgeräten
  const returnLoanerDeviceMutation = useMutation({
    mutationFn: async (repairId: number) => {
      const response = await apiRequest('POST', `/api/repairs/${repairId}/return-loaner`);
      if (!response.ok) {
        throw new Error('Fehler beim Zurückgeben des Leihgeräts');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices'] });
      setShowLoanerWarning(false);
      toast({
        title: "Erfolg",
        description: "Leihgerät wurde erfolgreich zurückgegeben",
      });
      
      // Nach erfolgreicher Rückgabe, öffne QR-Code Dialog
      if (warningRepairId) {
        const repair = repairs?.find(r => r.id === warningRepairId);
        const customer = customers?.find(c => c.id === repair?.customerId);
        
        if (repair && customer) {
          setSelectedRepairForSignature({
            id: repair.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            device: `${repair.brand} ${repair.model}`,
            issue: repair.issue,
            status: repair.status,
            estimatedCost: repair.estimatedCost,
            depositAmount: repair.depositAmount,
            customerId: repair.customerId
          });
          setShowQRSignatureDialog(true);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Leihgerät konnte nicht zurückgegeben werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Status-Änderung Mutation
  const updateStatusMutation = useMutation<any, Error, { id: number; status: string; sendEmail?: boolean; technicianNote?: string }>({
    mutationFn: async (variables) => {
      const response = await apiRequest(
        'PATCH',
        `/api/repairs/${variables.id}/status`,
        { status: variables.status, sendEmail: variables.sendEmail, technicianNote: variables.technicianNote }
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
  
  // Handler für QR-Unterschrift öffnen mit Leihgeräte-Prüfung
  const handleOpenQRSignature = async (repairId: number) => {
    // Finde die Reparatur und den Kunden
    const repair = repairs?.find(r => r.id === repairId);
    const customer = customers?.find(c => c.id === repair?.customerId);
    
    if (!repair || !customer) return;

    console.log('🔍 Dashboard QR-Code geklickt für Reparatur:', repair.id, 'Status:', repair.status);
    
    // Prüfe bei Status "fertig" IMMER, ob ein Leihgerät zugewiesen ist
    if (repair.status === 'fertig') {
      try {
        console.log('🔍 Dashboard Status ist "fertig" - prüfe Leihgerät für Reparatur', repair.id);
        
        const response = await fetch(`/api/repairs/${repair.id}/loaner-device`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🔍 Dashboard API Response Status:', response.status);
        
        if (response.ok) {
          const loanerDevice = await response.json();
          console.log('🔍 Dashboard Leihgerät-Daten erhalten:', loanerDevice);
          
          // Wenn ein Leihgerät zugewiesen ist, zeige Warning-Dialog
          if (loanerDevice && loanerDevice.id) {
            console.log('⚠️ Dashboard Leihgerät gefunden, zeige Warning-Dialog');
            setSelectedLoanerDevice(loanerDevice);
            setWarningRepairId(repair.id);
            setShowLoanerWarning(true);
            return;
          }
        }
      } catch (error) {
        console.log('🔍 Dashboard Keine Leihgerät-Info verfügbar, öffne QR-Code normal');
      }
    }

    // Normaler QR-Code-Dialog ohne Leihgerät
    setSelectedRepairForSignature({
      id: repair.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      device: `${repair.brand} ${repair.model}`,
      issue: repair.issue,
      status: repair.status,
      estimatedCost: repair.estimatedCost,
      depositAmount: repair.depositAmount,
      customerId: repair.customerId
    });
    setShowQRSignatureDialog(true);
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

  // Business settings für den Geschäftsnamen
  const { data: businessSettingsQuery } = useQuery<{ businessName: string }>({
    queryKey: ['/api/business-settings']
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
      loanerDeviceId?: number | null;
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
          createdAt: repair.createdAt.toString(),
          loanerDeviceId: repair.loanerDeviceId
        };
        return dashboardRepair;
      });
  }, [repairs, customers]);

  // Funktion zum Navigieren zu einer spezifischen Reparatur
  const handleRepairClick = (repairId: number) => {
    if (onTabChange) {
      onTabChange('repairs');
      // Setze die Reparatur-ID in localStorage, damit sie in RepairsTab gelesen werden kann
      localStorage.setItem('selectedRepairId', repairId.toString());
    }
  };



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
            onRepairClick={handleRepairClick}
            onQRSignatureClick={handleOpenQRSignature}
          />
        </div>
      </motion.div>

      {/* Status-Änderungsdialog */}
      <ChangeStatusDialog
        open={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        repairId={selectedRepairId}
        currentStatus={currentStatus}
        onUpdateStatus={(id, status, sendEmail, technicianNote) => updateStatusMutation.mutate({ id, status, sendEmail, technicianNote })}
      />

      {/* Repair bearbeiten Dialog */}
      {repairs && selectedRepairId && (
        <EditRepairDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          repair={repairs.find(r => r.id === selectedRepairId) as any || null}
        />
      )}

      {/* QR-Code Unterschrift Dialog */}
      {selectedRepairForSignature && (
        <QRSignatureDialog
          open={showQRSignatureDialog}
          onOpenChange={setShowQRSignatureDialog}
          repair={selectedRepairForSignature}
          businessName={businessSettingsData?.businessName || businessSettingsQuery?.businessName || 'Handyshop'}
        />
      )}

      {/* Leihgeräte Warning Dialog */}
      <Dialog open={showLoanerWarning} onOpenChange={setShowLoanerWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Leihgerät noch nicht zurückgegeben
            </DialogTitle>
            <DialogDescription>
              Der Kunde hat noch ein Leihgerät ausgegeben. Bitte geben Sie das Leihgerät zurück, bevor Sie fortfahren.
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoanerDevice && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-sm">
                <div className="font-medium text-orange-800">Ausgegebenes Leihgerät:</div>
                <div className="text-orange-700">
                  {selectedLoanerDevice.brand} {selectedLoanerDevice.model}
                </div>
                <div className="text-orange-600 text-xs mt-1">
                  Typ: {selectedLoanerDevice.deviceType}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={() => setShowLoanerWarning(false)}
              variant="outline"
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                if (warningRepairId) {
                  returnLoanerDeviceMutation.mutate(warningRepairId);
                }
              }}
              disabled={returnLoanerDeviceMutation.isPending}
              className="flex-1"
            >
              {returnLoanerDeviceMutation.isPending ? 'Wird zurückgegeben...' : 'Leihgerät zurückgegeben'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
