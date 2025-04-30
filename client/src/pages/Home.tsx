import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { TabNavigation } from '@/components/layout/TabNavigation';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { RepairsTab } from '@/components/repairs/RepairsTab';
import { CustomersTab } from '@/components/customers/CustomersTab';
import { StatisticsTabRebuilt as StatisticsTab } from '@/components/statistics/StatisticsTabRebuilt';
import CostEstimatesTab from '@/components/cost-estimates/CostEstimatesTab';
import { NewOrderModal } from '@/components/NewOrderModal';
import ToastTestDialog from '@/components/ToastTestDialog';
import { Button } from '@/components/ui/button';


type Tab = 'dashboard' | 'repairs' | 'customers' | 'statistics' | 'cost-estimates';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isToastTestOpen, setIsToastTestOpen] = useState(false);
  
  const handleNewOrder = () => {
    // Wir benötigen keine Parameter mehr, da wir die Kundendaten im localStorage speichern
    console.log("Home: handleNewOrder aufgerufen ohne Parameter");
    setIsNewOrderModalOpen(true);
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <Header />
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
      
      <ToastTestDialog
        open={isToastTestOpen}
        onOpenChange={setIsToastTestOpen}
      />

      {/* Toast-Test-Button */}
      <div className="fixed bottom-4 left-4 z-10">
        <Button onClick={() => setIsToastTestOpen(true)} variant="outline" className="flex items-center gap-2">
          <span>Toast-Test</span>
        </Button>
      </div>
    </div>
  );
}
