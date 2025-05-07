import React from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { EmailSettingsTab } from '@/components/settings/EmailSettingsTab';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function EmailSettingsPage() {
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
          activeTab="settings" 
          onTabChange={() => {}} 
          canUseCostEstimates={canUseCostEstimates} 
        />
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header mit Benutzerdaten */}
        <Header 
          variant="app" 
          activeTab="settings" 
          onTabChange={() => {}} 
          canUseCostEstimates={canUseCostEstimates} 
        />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <ScrollArea className="h-full">
            <div className="h-full">
              <h1 className="text-2xl font-bold mb-6">E-Mail-Einstellungen</h1>
              <EmailSettingsTab />
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}