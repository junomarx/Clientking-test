import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps } from "wouter";

interface ProtectedRouteProps {
  path: string;
  children?: React.ReactNode;
  component?: React.ComponentType<any>;
  exact?: boolean;
}

export function ProtectedRoute({ path, children, component: Component, exact }: ProtectedRouteProps) {
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

  return (
    <Route path={path}>
      {Component ? <Component /> : children}
    </Route>
  );
}

export function AdminProtectedRoute({ path, children, component: Component, exact }: ProtectedRouteProps) {
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
        <Redirect to="/app" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      {Component ? <Component /> : children}
    </Route>
  );
}

export function SuperadminProtectedRoute({ path, children, component: Component, exact }: ProtectedRouteProps) {
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

  return (
    <Route path={path}>
      {Component ? <Component /> : children}
    </Route>
  );
}
