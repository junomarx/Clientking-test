import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { TabNavigation } from '@/components/layout/TabNavigation';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { RepairsTab } from '@/components/repairs/RepairsTab';
import { CustomersTab } from '@/components/customers/CustomersTab';
import { NewOrderModal } from '@/components/NewOrderModal';
import { NewRepairModal } from '@/components/repairs/NewRepairModal';

type Tab = 'dashboard' | 'repairs' | 'customers';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
  const handleNewOrder = () => {
    setIsNewOrderModalOpen(true);
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <Header />
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="tab-content">
          {activeTab === 'dashboard' && (
            <DashboardTab onNewOrder={handleNewOrder} />
          )}
          
          {activeTab === 'repairs' && (
            <RepairsTab onNewOrder={handleNewOrder} />
          )}
          
          {activeTab === 'customers' && (
            <CustomersTab onNewOrder={handleNewOrder} />
          )}
        </div>
      </div>
      
      <NewOrderModal 
        open={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)} 
      />
    </div>
  );
}
