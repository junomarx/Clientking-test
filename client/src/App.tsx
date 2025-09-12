import React, { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import SuperadminPage from "@/pages/superadmin-page";
import MultiShopAdminPage from "@/pages/multi-shop-admin-page";
import MSAProfilePage from "@/pages/msa-profile-page";
import MSABusinessPage from "@/pages/msa-business-page";
import MSAPricingPage from "@/pages/msa-pricing-page";

// Design Preview Imports wurden entfernt
import SettingsPage from "@/pages/settings-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import DeviceSelectorDemo from "@/pages/device-selector-demo";
import DeviceFinderDemo from "@/pages/device-finder-demo";
import OptimizedTableDemo from "@/pages/optimized-table-demo";
import ResponsiveDevicesDemo from "@/pages/responsive-devices-demo";
import ApiTest from "@/pages/api-test";
import SignaturePage from "@/pages/signature-page";
import { ProtectedRoute, SuperadminProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { BusinessSettingsProvider } from "./hooks/use-business-settings";
import { PrintManagerProvider } from "@/components/repairs/PrintOptionsManager";
import { OnlineStatusProvider } from "./hooks/use-online-status";
import { KioskModeProvider } from "./hooks/use-kiosk-mode";
import { KioskOverlay } from "@/components/kiosk/KioskOverlay";
import { useEffect } from "react";
import { useTheme } from "./hooks/use-theme";
import { clearAllBrands, clearAllModels } from '@/components/repairs/ClearCacheHelpers';

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/device-selector-demo" component={DeviceSelectorDemo} />
      <Route path="/device-finder-demo" component={DeviceFinderDemo} />
      <Route path="/optimized-table-demo" component={OptimizedTableDemo} />
      <Route path="/responsive-devices-demo" component={ResponsiveDevicesDemo} />
      <Route path="/api-test" component={ApiTest} />
      <Route path="/signature/:tempId" component={SignaturePage} />
      

      <Route path="/superadmin">
        <ProtectedRoute path="/superadmin">
          <SuperadminPage />
        </ProtectedRoute>
      </Route>
      <Route path="/multi-shop-admin">
        <ProtectedRoute path="/multi-shop-admin">
          <MultiShopAdminPage />
        </ProtectedRoute>
      </Route>
      <Route path="/msa/profile">
        <ProtectedRoute path="/msa/profile">
          <MSAProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/msa/business">
        <ProtectedRoute path="/msa/business">
          <MSABusinessPage />
        </ProtectedRoute>
      </Route>
      <Route path="/msa/pricing">
        <ProtectedRoute path="/msa/pricing">
          <MSAPricingPage />
        </ProtectedRoute>
      </Route>

      <Route path="/repairs/:orderCode">
        <ProtectedRoute path="/repairs/:orderCode">
          <Home />
        </ProtectedRoute>
      </Route>
      
      <Route path="/">
        <ProtectedRoute path="/">
          <Home />
        </ProtectedRoute>
      </Route>
      
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
          
          try {
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
            } else if (response.status === 401) {
              console.log('Keine aktive Sitzung gefunden (401), Benutzer ist nicht angemeldet');
            } else {
              console.log('Unbekannter Fehler beim Überprüfen der Sitzung:', response.status);
            }
          } catch (fetchError) {
            console.log('Fehler beim Abrufen der Benutzersitzung (Network/Fetch Error):', fetchError);
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
        <OnlineStatusProvider>
          <KioskModeProvider>
            <BusinessSettingsProvider>
              <ThemeProvider>
                <PrintManagerProvider>
                  <TooltipProvider>
                    <TitleUpdater />
                    <CacheClearer />
                    <Toaster />
                    <Router />
                    <KioskOverlay />
                  </TooltipProvider>
                </PrintManagerProvider>
              </ThemeProvider>
            </BusinessSettingsProvider>
          </KioskModeProvider>
        </OnlineStatusProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
