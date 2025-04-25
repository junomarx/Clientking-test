import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { PrintManagerProvider } from "@/components/repairs/PrintOptionsManager";
import { useEffect } from "react";
import { useTheme } from "./hooks/use-theme";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/">
        <Home />
      </ProtectedRoute>
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Component to update the document title
function TitleUpdater() {
  const { companyName } = useTheme();
  
  useEffect(() => {
    if (companyName) {
      document.title = companyName;
    }
  }, [companyName]);
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <PrintManagerProvider>
            <TooltipProvider>
              <TitleUpdater />
              <Toaster />
              <Router />
            </TooltipProvider>
          </PrintManagerProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
