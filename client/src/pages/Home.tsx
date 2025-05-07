import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { RepairsTab } from '@/components/repairs/RepairsTab';
import { CustomersTab } from '@/components/customers/CustomersTab';
import { StatisticsTabRebuilt as StatisticsTab } from '@/components/statistics/StatisticsTabRebuilt';
import CostEstimatesTab from '@/components/cost-estimates/CostEstimatesTab';
import { NewOrderModal } from '@/components/NewOrderModal';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import der Einstellungs-Komponenten
import { BusinessSettingsTab } from '@/components/settings/BusinessSettingsTab';
import { EmailSettingsTab } from '@/components/settings/EmailSettingsTab';
import { PrintSettingsTab } from '@/components/settings/PrintSettingsTab';
import { SubscriptionSettingsTab } from '@/components/settings/SubscriptionSettingsTab';
import { UserSettingsTab } from '@/components/settings/UserSettingsTab';

type Tab = 'dashboard' | 'repairs' | 'customers' | 'statistics' | 'cost-estimates' | 
          'business-settings' | 'email-settings' | 'print-settings' | 'subscription-settings' | 'user-settings';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [location] = useLocation();
  
  // URL Parameter auswerten für Tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    
    // Tab aus URL setzen, wenn vorhanden
    if (tabParam) {
      const validTabs = [
        'dashboard', 'repairs', 'customers', 'statistics', 'cost-estimates',
        'business-settings', 'email-settings', 'print-settings', 'subscription-settings', 'user-settings'
      ];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam as Tab);
      }
    }
  }, [location]);
  
  const handleNewOrder = () => {
    console.log("Home: handleNewOrder aufgerufen ohne Parameter");
    setIsNewOrderModalOpen(true);
  };
  
  // Event-Listener für das Öffnen der Reparaturdetails
  useEffect(() => {
    const handleOpenRepairDetails = (event: CustomEvent) => {
      const { repairId } = event.detail;
      if (repairId) {
        setActiveTab('repairs');
        // Kurze Verzögerung, damit der Tab-Wechsel abgeschlossen ist
        setTimeout(() => {
          // Event-Objekt erstellen und auslösen, um den Dialog zu öffnen
          const openDetailsEvent = new CustomEvent('open-repair-details-dialog', { 
            detail: { repairId }
          });
          window.dispatchEvent(openDetailsEvent);
        }, 200);
      }
    };

    // Event-Listener für das Öffnen des Einstellungstabs
    const handleOpenSettingsDialog = () => {
      console.log("Event für Öffnen der Einstellungen empfangen");
      setActiveTab('business-settings');
    };
    
    // Event-Listener für "Neuer Auftrag" Button
    const handleTriggerNewOrder = () => {
      console.log("Event für Neuer Auftrag empfangen");
      setIsNewOrderModalOpen(true);
    };

    // Event-Listener registrieren
    window.addEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
    window.addEventListener('open-settings-dialog', handleOpenSettingsDialog);
    window.addEventListener('trigger-new-order', handleTriggerNewOrder);
    
    // Event-Listener beim Unmount entfernen
    return () => {
      window.removeEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
      window.removeEventListener('open-settings-dialog', handleOpenSettingsDialog);
      window.removeEventListener('trigger-new-order', handleTriggerNewOrder);
    };
  }, []);

  // Abfrage für Kostenvoranschläge-Berechtigung
  const { data: costEstimatesAccess } = useQuery<{ canUseCostEstimates: boolean }>({
    queryKey: ['/api/can-use-cost-estimates']
  });
  
  const canUseCostEstimates = costEstimatesAccess?.canUseCostEstimates || false;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Sidebar komponente - nur auf Desktop sichtbar */}
      <div className="hidden md:block">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={(tab) => setActiveTab(tab as Tab)} 
          canUseCostEstimates={canUseCostEstimates} 
        />
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header mit Benutzerdaten */}
        <Header variant="app" activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} canUseCostEstimates={canUseCostEstimates} />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <ScrollArea className="h-full">
            <div className="h-full">
              {activeTab === 'dashboard' && (
                <DashboardTab 
                  onNewOrder={handleNewOrder} 
                  onTabChange={setActiveTab} 
                />
              )}
              
              {activeTab === 'repairs' && (
                <RepairsTab onNewOrder={handleNewOrder} />
              )}
              
              {activeTab === 'customers' && (
                <CustomersTab onNewOrder={handleNewOrder} />
              )}
              
              {activeTab === 'statistics' && (
                <StatisticsTab onTabChange={setActiveTab} />
              )}
              
              {activeTab === 'cost-estimates' && (
                <CostEstimatesTab />
              )}
              
              {activeTab === 'business-settings' && (
                <BusinessSettingsTab />
              )}
              
              {activeTab === 'email-settings' && (
                <EmailSettingsTab />
              )}
              
              {activeTab === 'print-settings' && (
                <PrintSettingsTab />
              )}
              
              {activeTab === 'subscription-settings' && (
                <SubscriptionSettingsTab />
              )}
              
              {activeTab === 'user-settings' && (
                <UserSettingsTab />
              )}
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
