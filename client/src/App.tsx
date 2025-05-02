import React, { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin-page";
import AdminDesignPreview from "@/pages/admin/DesignPreviewPage";
import AdminDesignPreviewSettings from "@/pages/admin/DesignPreviewSettingsPage";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import LandingPage from "@/pages/landing/LandingPage";
import { ProtectedRoute, AdminProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { BusinessSettingsProvider } from "./hooks/use-business-settings";
import { PrintManagerProvider } from "@/components/repairs/PrintOptionsManager";
import { useEffect } from "react";
import { useTheme } from "./hooks/use-theme";
import { clearAllBrands, clearAllModels } from '@/components/repairs/ClearCacheHelpers';

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/app">
        <Home />
      </ProtectedRoute>
      <AdminProtectedRoute path="/admin">
        <AdminPage />
      </AdminProtectedRoute>
      <AdminProtectedRoute path="/admin/design-preview">
        <AdminDesignPreview />
      </AdminProtectedRoute>
      <AdminProtectedRoute path="/admin/design-preview-settings">
        <AdminDesignPreviewSettings />
      </AdminProtectedRoute>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route component={NotFound} />
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
