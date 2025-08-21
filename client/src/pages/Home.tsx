import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { RepairsTab } from '@/components/repairs/RepairsTab';
import { CustomersTab } from '@/components/customers/CustomersTab';
import { StatisticsTabRebuilt as StatisticsTab } from '@/components/statistics/StatisticsTabRebuilt';
import { CostEstimatesTab } from '@/components/cost-estimates/CostEstimatesTab';
import { OrdersTab } from '@/components/orders/OrdersTab';
import { NewOrderModal } from '@/components/NewOrderModal';
import { useLocation, useParams, Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import PermissionDialog from '@/components/permissions/PermissionDialog';
import { useAuth } from '@/hooks/use-auth';

// Import der Einstellungs-Komponenten
import { BusinessSettingsTab } from '@/components/settings/BusinessSettingsTab';
import { EmailSettingsTab } from '@/components/settings/EmailSettingsTab';
import { PrintSettingsTab } from '@/components/settings/PrintSettingsTab';
import { SubscriptionSettingsTab } from '@/components/settings/SubscriptionSettingsTab';
import { UserSettingsTab } from '@/components/settings/UserSettingsTab';
import EmployeesPage from '@/pages/employees-page';
import { LoanerDevicesTab } from '@/components/loaner-devices/LoanerDevicesTab';
import MultiShopAdminManagement from '@/components/multi-shop/MultiShopAdminManagement';

type Tab = 'dashboard' | 'repairs' | 'orders' | 'customers' | 'statistics' | 'cost-estimates' | 'loaner-devices' |
          'business-settings' | 'email-settings' | 'print-settings' | 'subscription-settings' | 'user-settings' | 'employees' | 'multi-shop-admin';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [location] = useLocation();
  const params = useParams();
  const [qrCodeFilter, setQrCodeFilter] = useState<string>('');
  const [isQrCodeNavigation, setIsQrCodeNavigation] = useState<boolean>(false);
  
  // Multi-Shop Admin Modus prüfen
  const [multiShopAdminMode, setMultiShopAdminMode] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  
  // Permission Dialog State
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  
  // Auth Hook für User-Informationen
  const { user } = useAuth();

  // Multi-Shop Admin automatisch zur neuen Seite weiterleiten
  if (user && user.isMultiShopAdmin && location === '/') {
    return <Redirect to="/multi-shop-admin" />;
  }

  // Permission-Anfragen für Shop-Owner laden
  const { data: pendingPermissions = [], refetch: refetchPermissions } = useQuery<any[]>({
    queryKey: ['/api/permissions/pending'],
    enabled: !!user && !user.isMultiShopAdmin, // Nur für normale Shop-Owner laden
    refetchInterval: 30000, // Alle 30 Sekunden prüfen
  });

  // Automatisch Permission-Dialog öffnen wenn neue Anfragen da sind
  useEffect(() => {
    if (pendingPermissions.length > 0 && !user?.isMultiShopAdmin) {
      setIsPermissionDialogOpen(true);
    }
  }, [pendingPermissions.length, user?.isMultiShopAdmin]);

  // URL Parameter auswerten für Tab und QR-Code-Filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    // Multi-Shop Admin Modus aus localStorage prüfen
    const isMultiShopMode = localStorage.getItem('multiShopAdminMode') === 'true';
    const shopId = localStorage.getItem('multiShopAdminSelectedShop');
    
    if (isMultiShopMode && shopId) {
      console.log(`🌐 DSGVO-konform: Multi-Shop Admin Modus aktiviert für Shop ${shopId}`);
      setMultiShopAdminMode(true);
      setSelectedShopId(parseInt(shopId));
      
      // Multi-Shop Modus in der Sidebar anzeigen
      document.title = `Shop ${shopId} - Handyshop Verwaltung`;
    }
    
    // QR-Code-Filter aus URL-Pfad extrahieren (für /repairs/:orderCode)
    if (params.orderCode) {
      setActiveTab('repairs');
      setQrCodeFilter(params.orderCode);
      setIsQrCodeNavigation(true);
    }
    
    // Tab aus URL setzen, wenn vorhanden
    if (tabParam) {
      const validTabs = [
        'dashboard', 'repairs', 'orders', 'customers', 'statistics', 'cost-estimates', 'loaner-devices',
        'business-settings', 'email-settings', 'print-settings', 'subscription-settings', 'user-settings', 'employees'
      ];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam as Tab);
      }
    }
  }, [location, params]);

  // Tab-Wechsel Handler - QR-Code-Filter zurücksetzen bei manueller Navigation
  const handleTabChange = (newTab: Tab) => {
    setActiveTab(newTab);
    
    // QR-Code-Filter nur zurücksetzen, wenn es eine manuelle Navigation ist
    // (nicht durch QR-Code ausgelöst)
    if (isQrCodeNavigation && newTab !== 'repairs') {
      setQrCodeFilter('');
      setIsQrCodeNavigation(false);
    } else if (newTab === 'repairs' && !isQrCodeNavigation) {
      // Wenn manuell zu Repairs gewechselt wird, QR-Code-Filter löschen
      setQrCodeFilter('');
    }
  };
  
  const handleNewOrder = (customerId?: number) => {
    console.log("Home: handleNewOrder aufgerufen mit customerId:", customerId);
    setSelectedCustomerId(customerId || null);
    setIsNewOrderModalOpen(true);
  };

  const handleOrderCreated = () => {
    // Navigation zur Reparaturen-Seite nach erfolgreichem Erstellen eines Auftrags
    setActiveTab('repairs');
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
      console.log("Event für Neuer Auftrag empfangen - selectedCustomerId wird auf null gesetzt");
      setSelectedCustomerId(null); // Explizit auf null setzen für neue Aufträge
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

  // Kostenvoranschlag-Funktionalität entfernt

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Sidebar komponente - nur auf Desktop sichtbar */}
      <div className="hidden md:block">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
        />
      </div>
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header mit Benutzerdaten */}
        <Header variant="app" activeTab={activeTab} onTabChange={handleTabChange} />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-3 md:p-6">
          <ScrollArea className="h-full">
            <div className="h-full">
              {activeTab === 'dashboard' && (
                <DashboardTab 
                  onNewOrder={handleNewOrder} 
                  onTabChange={handleTabChange} 
                />
              )}
              
              {activeTab === 'repairs' && (
                <RepairsTab onNewOrder={handleNewOrder} initialFilter={qrCodeFilter} />
              )}
              
              {activeTab === 'orders' && (
                <OrdersTab />
              )}
              
              {activeTab === 'customers' && (
                <CustomersTab onNewOrder={handleNewOrder} />
              )}
              
              {activeTab === 'statistics' && (
                <StatisticsTab onTabChange={handleTabChange} />
              )}
              
              {activeTab === 'cost-estimates' && (
                <CostEstimatesTab onNewCostEstimate={() => console.log('Neuer Kostenvoranschlag erstellen')} />
              )}
              
              {activeTab === 'loaner-devices' && (
                <LoanerDevicesTab />
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
              
              {activeTab === 'employees' && (
                <EmployeesPage />
              )}
              
              {activeTab === 'multi-shop-admin' && (
                <MultiShopAdminManagement />
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
      
      {/* Modal für neue Aufträge */}
      <NewOrderModal 
        open={isNewOrderModalOpen} 
        onClose={() => {
          console.log("NewOrderModal wird geschlossen - selectedCustomerId wird zurückgesetzt");
          setIsNewOrderModalOpen(false);
          setSelectedCustomerId(null);
        }}
        customerId={selectedCustomerId}
        onSuccess={handleOrderCreated}
      />

      {/* Permission Dialog für Shop-Owner */}
      {!user?.isMultiShopAdmin && (
        <PermissionDialog
          permissions={pendingPermissions}
          isOpen={isPermissionDialogOpen}
          onClose={() => {
            setIsPermissionDialogOpen(false);
            refetchPermissions(); // Permissions neu laden nach Schließen
          }}
        />
      )}
    </div>
  );
}
