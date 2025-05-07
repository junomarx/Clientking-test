import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { RepairsTab } from '@/components/repairs/RepairsTab';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NewOrderModal } from '@/components/NewOrderModal';

export default function RepairsPage() {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // Abfrage für Kostenvoranschläge-Berechtigung für Header/Sidebar
  const { data: costEstimatesAccess } = useQuery<{ canUseCostEstimates: boolean }>({
    queryKey: ['/api/can-use-cost-estimates']
  });
  
  const canUseCostEstimates = costEstimatesAccess?.canUseCostEstimates || false;

  // Event-Listener für "Neuer Auftrag" Button
  useEffect(() => {
    const handleTriggerNewOrder = () => {
      console.log("Event für Neuer Auftrag empfangen");
      setIsNewOrderModalOpen(true);
    };

    // Event-Listener registrieren
    window.addEventListener('trigger-new-order', handleTriggerNewOrder);
    
    // Event-Listener beim Unmount entfernen
    return () => {
      window.removeEventListener('trigger-new-order', handleTriggerNewOrder);
    };
  }, []);
  
  // Event Handler für das Öffnen der Reparaturdetails
  const handleOpenRepairDetails = (event: CustomEvent) => {
    if (event.detail && event.detail.repairId) {
      // Die RepairsTab-Komponente wird dies intern behandeln, da wir die repairId weitergeben
      console.log('RepairPage handleOpenRepairDetails for ID:', event.detail.repairId);
    }
  };
  
  // Event Listener für Reparaturdetails
  React.useEffect(() => {
    window.addEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
    return () => {
      window.removeEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
    };
  }, []);
  
  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Sidebar komponente - nur auf Desktop sichtbar */}
      <div className="hidden md:block">
        <Sidebar 
          activeTab="repairs" 
          onTabChange={() => {}} 
          canUseCostEstimates={canUseCostEstimates} 
        />
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header mit Benutzerdaten */}
        <Header 
          variant="app" 
          activeTab="repairs" 
          onTabChange={() => {}} 
          canUseCostEstimates={canUseCostEstimates} 
        />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <ScrollArea className="h-full">
            <div className="h-full">
              <RepairsTab 
                onNewOrder={() => {
                  // Create and dispatch a custom event for creating a new order
                  window.dispatchEvent(new CustomEvent('trigger-new-order'));
                }}
              />
            </div>
          </ScrollArea>
        </main>
      </div>
      
      {/* Modal für neue Aufträge */}
      <NewOrderModal 
        open={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)}
        customerId={selectedCustomerId}
      />
    </div>
  );
}