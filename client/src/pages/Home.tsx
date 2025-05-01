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
import { SettingsDialogNew } from '@/components/settings/SettingsDialogNew';


type Tab = 'dashboard' | 'repairs' | 'customers' | 'statistics' | 'cost-estimates';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [searchParam, setSearchParam] = useState<string>('');
  const [location] = useLocation();
  
  // URL Parameter auswerten für Tab und Suchbegriff
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const searchValue = params.get('search');
    
    // Tab aus URL setzen, wenn vorhanden
    if (tabParam) {
      if (['dashboard', 'repairs', 'customers', 'statistics', 'cost-estimates'].includes(tabParam as Tab)) {
        setActiveTab(tabParam as Tab);
      }
      // Settings-Dialog öffnen, wenn der Tab "settings" ist
      else if (tabParam === 'settings') {
        setIsSettingsOpen(true);
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

    // Event-Listener registrieren
    window.addEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
    
    // Event-Listener beim Unmount entfernen
    return () => {
      window.removeEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <Header variant="app" />
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="tab-content">
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
        </div>
      </div>
      
      <NewOrderModal 
        open={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)}
        customerId={selectedCustomerId}
      />
      
      {/* Einstellungs-Dialog */}
      <SettingsDialogNew
        open={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          // Wenn wir über die URL zu den Einstellungen gekommen sind, entferne 'tab=settings' aus der URL
          window.history.pushState({}, '', '/app');
        }}
      />
    </div>
  );
}
