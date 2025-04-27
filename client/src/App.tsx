import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import { ProtectedRoute } from "./lib/protected-route";
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
      <ProtectedRoute path="/">
        <Home />
      </ProtectedRoute>
      <ProtectedRoute path="/admin">
        <AdminPage />
      </ProtectedRoute>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Component to update the document title
function TitleUpdater() {
  const { companyName } = useTheme();
  
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
  
  return null;
}

// Component to clear cache on app start
function CacheClearer() {
  useEffect(() => {
    // Löscht alle gespeicherten Marken und Modelle beim Start der App
    clearAllBrands();
    clearAllModels();
    console.log('Cache für Gerätearten und Marken wurde beim Start gelöscht');
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
