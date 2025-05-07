import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { TabNavigation } from '@/components/layout/TabNavigation';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { RepairsTab } from '@/components/repairs/RepairsTab';
import { CustomersTab } from '@/components/customers/CustomersTab';
import { StatisticsTabRebuilt as StatisticsTab } from '@/components/statistics/StatisticsTabRebuilt';
import CostEstimatesTab from '@/components/cost-estimates/CostEstimatesTab';
import { NewOrderModal } from '@/components/NewOrderModal';
import { useLocation } from 'wouter';
import { SettingsPageContent } from '@/components/settings';


type Tab = 'dashboard' | 'repairs' | 'customers' | 'statistics' | 'cost-estimates' | 'settings';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const [searchParam, setSearchParam] = useState<string>('');
  const [location] = useLocation();
  
  // URL Parameter auswerten für Tab und Suchbegriff
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const searchValue = params.get('search');
    
    // Tab aus URL setzen, wenn vorhanden
    if (tabParam) {
      if (['dashboard', 'repairs', 'customers', 'statistics', 'cost-estimates', 'settings'].includes(tabParam as Tab)) {
        setActiveTab(tabParam as Tab);
      }
    }
    
    // Suchbegriff aus URL setzen
    if (searchValue) {
      setSearchParam(searchValue);
    }
  }, [location]);
  
  const handleNewOrder = () => {
    // Wir benötigen keine Parameter mehr, da wir die Kundendaten im localStorage speichern
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
      setActiveTab('settings');
    };

    // Event-Listener registrieren
    window.addEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
    window.addEventListener('open-settings-dialog', handleOpenSettingsDialog);
    
    // Event-Listener beim Unmount entfernen
    return () => {
      window.removeEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
      window.removeEventListener('open-settings-dialog', handleOpenSettingsDialog);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header variant="app" />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          
          {/* Main content */}
          <main className="flex-1 overflow-auto p-3 md:p-6">
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
              
              {activeTab === 'settings' && (
                <SettingsPageContent />
              )}
            </div>
          </main>
        </div>
      </div>
      
      <NewOrderModal 
        open={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)}
        customerId={selectedCustomerId}
      />
    </div>
  );
}
