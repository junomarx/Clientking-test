import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { NewOrderModal } from '@/components/NewOrderModal';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DashboardPage() {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  
  const handleNewOrder = () => {
    console.log("DashboardPage: handleNewOrder aufgerufen");
    setIsNewOrderModalOpen(true);
  };
  
  // Event-Listener für neuen Auftrag
  useEffect(() => {
    const handleTriggerNewOrder = (event: CustomEvent) => {
      const { customerId } = event.detail;
      setSelectedCustomerId(customerId || null);
      setIsNewOrderModalOpen(true);
    };
    
    window.addEventListener('trigger-new-order', handleTriggerNewOrder as EventListener);
    
    return () => {
      window.removeEventListener('trigger-new-order', handleTriggerNewOrder as EventListener);
    };
  }, []);
  
  // Abfrage für Kostenvoranschläge-Berechtigung für Header/Sidebar
  const { data: costEstimatesAccess } = useQuery<{ canUseCostEstimates: boolean }>({
    queryKey: ['/api/can-use-cost-estimates']
  });
  
  const canUseCostEstimates = costEstimatesAccess?.canUseCostEstimates || false;
  
  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Sidebar komponente - nur auf Desktop sichtbar */}
      <div className="hidden md:block">
        <Sidebar 
          activeTab="dashboard" 
          onTabChange={() => {}} 
          canUseCostEstimates={canUseCostEstimates} 
        />
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header mit Benutzerdaten */}
        <Header 
          variant="app" 
          activeTab="dashboard" 
          onTabChange={() => {}} 
          canUseCostEstimates={canUseCostEstimates} 
        />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <ScrollArea className="h-full">
            <div className="h-full">
              <DashboardTab onNewOrder={handleNewOrder} onTabChange={() => {}} />
            </div>
          </ScrollArea>
        </main>
      </div>
      
      {/* Modal für neuen Auftrag */}
      <NewOrderModal
        open={isNewOrderModalOpen}
        onClose={() => {
          setIsNewOrderModalOpen(false);
          setSelectedCustomerId(null);
        }}
        customerId={selectedCustomerId}
      />
    </div>
  );
}