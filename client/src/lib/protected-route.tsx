import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
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

export function AdminProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
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

  // Statt den alten Admin-Bereich anzuzeigen, leiten wir zum neuen Superadmin-Bereich weiter,
  // wenn der Benutzer Superadmin-Rechte hat
  if (user.isSuperadmin) {
    return (
      <Route path={path}>
        <Redirect to="/superadmin" />
      </Route>
    );
  }
  
  // Wenn der Benutzer ein gewöhnlicher Admin (aber kein Superadmin) ist,
  // leiten wir zum Home-Bereich weiter, da der alte Admin-Bereich nicht mehr benötigt wird
  return (
    <Route path={path}>
      <Redirect to="/app" />
    </Route>
  );
}

export function SuperadminProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
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

  if (!user.isSuperadmin) {
    return (
      <Route path={path}>
        <Redirect to="/app" />
      </Route>
    );
  }

  return <Route path={path}>{children}</Route>;
}
