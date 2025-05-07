import React, { Suspense } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin-page";
import SuperadminPage from "@/pages/superadmin-page";

// Layouts
import { MainLayout } from "@/layouts/MainLayout";

// Dashboard Komponenten
import { DashboardTab } from "@/components/dashboard/DashboardTab";
import { RepairsTab } from "@/components/repairs/RepairsTab";
import { CustomersTab } from "@/components/customers/CustomersTab";
import { StatisticsTabRebuilt as StatisticsTab } from "@/components/statistics/StatisticsTabRebuilt";
import CostEstimatesTab from "@/components/cost-estimates/CostEstimatesTab";
import { NewOrderModal } from "@/components/NewOrderModal";

// Settings Komponenten
import { BusinessSettingsTab } from "@/components/settings/BusinessSettingsTab";
import { EmailSettingsTab } from "@/components/settings/EmailSettingsTab";
import { PrintSettingsTab } from "@/components/settings/PrintSettingsTab";
import { SubscriptionSettingsTab } from "@/components/settings/SubscriptionSettingsTab";
import { UserSettingsTab } from "@/components/settings/UserSettingsTab";

import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import LandingPage from "@/pages/landing/LandingPage";
import { ProtectedRoute, AdminProtectedRoute, SuperadminProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { BusinessSettingsProvider } from "./hooks/use-business-settings";
import { PrintManagerProvider } from "@/components/repairs/PrintOptionsManager";
import { useEffect, useState } from "react";
import { useTheme } from "./hooks/use-theme";
import { clearAllBrands, clearAllModels } from '@/components/repairs/ClearCacheHelpers';

const AppDashboard = () => {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  
  const handleNewOrder = () => {
    setIsNewOrderModalOpen(true);
  };
  
  // Event-Listener für "Neuer Auftrag" Button
  useEffect(() => {
    const handleTriggerNewOrder = () => {
      setIsNewOrderModalOpen(true);
    };
    
    window.addEventListener('trigger-new-order', handleTriggerNewOrder);
    
    return () => {
      window.removeEventListener('trigger-new-order', handleTriggerNewOrder);
    };
  }, []);
  
  return (
    <>
      <DashboardTab onNewOrder={handleNewOrder} onTabChange={() => {}} />
      <NewOrderModal 
        open={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)}
        customerId={selectedCustomerId}
      />
    </>
  );
};

const AppRepairs = () => {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
  // Event-Listener für das Öffnen der Reparaturdetails
  useEffect(() => {
    const handleOpenRepairDetails = (event: CustomEvent) => {
      const { repairId } = event.detail;
      if (repairId) {
        // Event-Objekt erstellen und auslösen, um den Dialog zu öffnen
        const openDetailsEvent = new CustomEvent('open-repair-details-dialog', { 
          detail: { repairId }
        });
        window.dispatchEvent(openDetailsEvent);
      }
    };
    
    window.addEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
    
    return () => {
      window.removeEventListener('open-repair-details', handleOpenRepairDetails as EventListener);
    };
  }, []);
  
  return (
    <>
      <RepairsTab onNewOrder={() => setIsNewOrderModalOpen(true)} />
      <NewOrderModal 
        open={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)}
        customerId={null}
      />
    </>
  );
};

const AppCustomers = () => {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  
  return (
    <>
      <CustomersTab onNewOrder={() => setIsNewOrderModalOpen(true)} />
      <NewOrderModal 
        open={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)}
        customerId={null}
      />
    </>
  );
};

// Komponenten mit den richtigen Props
const StatisticsPage = () => <StatisticsTab onTabChange={() => {}} />;
const CostEstimatesPage = () => <CostEstimatesTab />;

// Redirect Komponente für Root-Pfad
const AppIndexRedirect = () => <Redirect to="/app/dashboard" />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      {/* App Routen mit MainLayout */}
      <ProtectedRoute path="/app">
        <MainLayout>
          <Switch>
            <Route path="/app" component={AppIndexRedirect} />
            <Route path="/app/dashboard" component={AppDashboard} />
            <Route path="/app/repairs" component={AppRepairs} />
            <Route path="/app/customers" component={AppCustomers} />
            <Route path="/app/statistics" component={StatisticsPage} />
            <Route path="/app/cost-estimates" component={CostEstimatesPage} />
            
            {/* Einstellungsrouten */}
            <Route path="/app/settings/shop" component={BusinessSettingsTab} />
            <Route path="/app/settings/email" component={EmailSettingsTab} />
            <Route path="/app/settings/print" component={PrintSettingsTab} />
            <Route path="/app/settings/plan" component={SubscriptionSettingsTab} />
            <Route path="/app/settings/user" component={UserSettingsTab} />
          </Switch>
        </MainLayout>
      </ProtectedRoute>
      
      <AdminProtectedRoute path="/admin">
        <AdminPage />
      </AdminProtectedRoute>
      <SuperadminProtectedRoute path="/superadmin">
        <SuperadminPage />
      </SuperadminProtectedRoute>

      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

// Component to update the document title and sync user session
function TitleUpdater() {
  const { companyName } = useTheme();
  
  // Dokument-Titel aktualisieren, wenn sich der Firmenname ändert
  useEffect(() => {
    if (companyName) {
      // Setze den Firmennamen als Dokumenttitel
      document.title = companyName;
      
      // Suche auch nach dem Title-Element in der Navigationsleiste und aktualisiere es
      const appTitle = document.querySelector('[data-app-title]');
      if (appTitle) {
        appTitle.textContent = companyName;
      }
    }
  }, [companyName]);
  
  // Nach dem Laden der App überprüfen wir, ob ein Benutzer in der Session ist
  // und synchronisieren mit dem localStorage, falls nötig
  useEffect(() => {
    // Wir überprüfen, ob es eine Sitzung gibt, aber keine userId im localStorage
    const checkAndSyncUserSession = async () => {
      try {
        // Nur abrufen, wenn derzeit kein userId im localStorage vorhanden ist
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          console.log('Keine userId im localStorage gefunden, Sitzung wird überprüft...');
          
          const response = await fetch('/api/user', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const user = await response.json();
            
            if (user && user.id) {
              console.log('Aktive Sitzung gefunden für Benutzer:', user.username);
              localStorage.setItem('userId', user.id.toString());
              localStorage.setItem('username', user.username);
              console.log('User-Daten wurden im localStorage gespeichert. userId:', user.id);
              
              // QueryClient neu initialisieren, damit alle Anfragen die neue UserID verwenden
              queryClient.invalidateQueries();
            }
          } else {
            console.log('Keine aktive Sitzung gefunden, Benutzer ist nicht angemeldet');
          }
        } else {
          console.log('UserId bereits im localStorage: ' + userId);
        }
      } catch (error) {
        console.error('Fehler beim Überprüfen der Benutzersitzung:', error);
      }
    };
    
    checkAndSyncUserSession();
  }, []);
  
  return null;
}

// Component to clear cache on app start
function CacheClearer() {
  useEffect(() => {
    // Löscht alle gespeicherten Hersteller und Modelle beim Start der App
    clearAllBrands();
    clearAllModels();
    console.log('Cache für Gerätearten und Hersteller wurde beim Start gelöscht');
  }, []);
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BusinessSettingsProvider>
          <ThemeProvider>
            <PrintManagerProvider>
              <TooltipProvider>
                <TitleUpdater />
                <CacheClearer />
                <Toaster />
                <Router />
              </TooltipProvider>
            </PrintManagerProvider>
          </ThemeProvider>
        </BusinessSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
