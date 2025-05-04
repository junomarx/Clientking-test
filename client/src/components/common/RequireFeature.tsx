import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasAccess } from "@/lib/permissions";
import { useUpgradeDialog } from "./UpgradeRequiredDialog";

interface RequireFeatureProps {
  feature: string;
  requiredPlan: "professional" | "enterprise";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Komponente, die prüft, ob der Benutzer Zugriff auf eine bestimmte Funktion hat.
 * Wenn nicht, wird ein Upgrade-Dialog angezeigt oder ein fallback gerendert.
 */
export function RequireFeature({ 
  feature, 
  requiredPlan, 
  children, 
  fallback 
}: RequireFeatureProps) {
  const { user } = useAuth();
  const { showUpgradeDialog, UpgradeDialog } = useUpgradeDialog();
  
  // Prüfen, ob der Benutzer Zugriff auf die Funktion hat
  const hasFeatureAccess = hasAccess(user, feature);
  
  // Wenn kein Zugriff, zeige Fallback oder null
  if (!hasFeatureAccess) {
    if (fallback) return <>{fallback}</>;
    return null;
  }
  
  // Wenn Zugriff, render die Kinder
  return <>{children}</>;
}

/**
 * HOC (Higher-Order Component) für Komponenten, die eine bestimmte Funktion benötigen
 */
export function withFeatureAccess<P extends object>(
  Component: React.ComponentType<P>,
  feature: string,
  requiredPlan: "professional" | "enterprise",
  options: { showUpgradeDialog?: boolean } = { showUpgradeDialog: true }
) {
  return function WrappedComponent(props: P) {
    const { user } = useAuth();
    const { showUpgradeDialog, UpgradeDialog } = useUpgradeDialog();
    
    // Prüfen, ob der Benutzer Zugriff auf die Funktion hat
    const hasFeatureAccess = hasAccess(user, feature);
    
    // Wenn kein Zugriff und der Dialog angezeigt werden soll, zeige Dialog
    React.useEffect(() => {
      if (!hasFeatureAccess && options.showUpgradeDialog) {
        showUpgradeDialog(feature, requiredPlan);
      }
    }, [hasFeatureAccess]);
    
    // Immer Dialog rendern, damit er angezeigt werden kann
    return (
      <>
        {hasFeatureAccess && <Component {...props} />}
        <UpgradeDialog />
      </>
    );
  };
}

/**
 * Hook zur Prüfung, ob der Benutzer Zugriff auf eine bestimmte Funktion hat
 * und zur Anzeige des Upgrade-Dialogs, wenn nicht
 */
export function useFeatureAccess(feature: string, requiredPlan: "professional" | "enterprise") {
  const { user } = useAuth();
  const { showUpgradeDialog, hideUpgradeDialog, UpgradeDialog } = useUpgradeDialog();
  
  // Prüfen, ob der Benutzer Zugriff auf die Funktion hat
  const hasFeatureAccess = hasAccess(user, feature);
  
  // Funktion zur Prüfung des Zugriffs und Anzeige des Dialogs bei Bedarf
  const checkAccess = React.useCallback(() => {
    if (!hasFeatureAccess) {
      showUpgradeDialog(feature, requiredPlan);
      return false;
    }
    return true;
  }, [hasFeatureAccess, feature, requiredPlan, showUpgradeDialog]);
  
  return { hasAccess: hasFeatureAccess, checkAccess, UpgradeDialog };
}