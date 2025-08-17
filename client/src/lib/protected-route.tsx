import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Multi-Shop Admin Weiterleitung: Wenn der Benutzer ein Multi-Shop Admin ist 
  // (isMultiShopAdmin = true, isSuperadmin = false), leite zur Multi-Shop Verwaltung weiter
  // ABER NICHT wenn er bereits auf /multi-shop ist (Endlosschleife vermeiden)
  if (user.isMultiShopAdmin && !user.isSuperadmin && path !== "/multi-shop") {
    return <Redirect to="/multi-shop" />;
  }

  return <>{children}</>;
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

  if (!user.isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path}>{children}</Route>;
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
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path}>{children}</Route>;
}
