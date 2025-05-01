import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ProtectedRouteProps {
  path: string;
  children: ReactNode;
}

export function ProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path}>{children}</Route>;
}

export function AdminProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Zusätzliche Prüfung, ob der Benutzer Admin-Rechte hat
  if (!user.isAdmin) {
    return (
      <Route path={path}>
        <div className="container mx-auto py-10">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Zugriff verweigert</AlertTitle>
            <AlertDescription>
              Sie benötigen Administratorrechte, um auf diese Seite zuzugreifen.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <a href="/app" className="text-primary hover:underline">
              Zurück zur Startseite
            </a>
          </div>
        </div>
      </Route>
    );
  }

  return <Route path={path}>{children}</Route>;
}