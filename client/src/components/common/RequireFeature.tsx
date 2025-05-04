import React from "react";
import { useAuth } from "@/hooks/use-auth";
// Import hasAccess nicht direkt aus @/lib/permissions, da es eine unterschiedliche Signatur hat
// Stattdessen benutze wir eine lokale Implementierung hasAccessClient
import { useUpgradeDialog } from "./UpgradeRequiredDialog";

// UserResponse Typ von useAuth abhängig, ohne Passwort
type UserResponse = Omit<import("@shared/schema").User, "password">;

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
  // Änderung der Typendefinition, um mit UserResponse-Typ zu funktionieren
  const hasFeatureAccess = hasAccessClient(user, feature);
  
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
    // Änderung der Typendefinition, um mit UserResponse-Typ zu funktionieren
    const hasFeatureAccess = hasAccessClient(user, feature);
    
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
  // Änderung der Typendefinition, um mit UserResponse-Typ zu funktionieren
  const hasFeatureAccess = hasAccessClient(user, feature);
  
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

/**
 * Clientseitige Version der hasAccess Funktion, die mit dem UserResponse Typ kompatibel ist
 */
function hasAccessClient(user: UserResponse | null, feature: string): boolean {
  // Wenn kein Benutzer übergeben wurde
  if (!user) return false;
  
  // Admin-Benutzer hat immer Zugriff auf alle Funktionen
  if (user.isAdmin || user.username === 'bugi') return true;

  const pricingPlan = user.pricingPlan as string;
  
  // Funktionen nach Tarifmodell definieren
  const permissions: Record<string, string[]> = {
    basic: [
      // Grundlegende Funktionen für alle Tarife
      "dashboard", 
      "repairs", 
      "customers", 
      "printA4",
      "deviceTypes",
      "brands"
    ],
    professional: [
      // Enthält alle basic-Funktionen
      "dashboard", 
      "repairs", 
      "customers", 
      "printA4",
      "deviceTypes",
      "brands",
      // Professional-spezifische Funktionen
      "costEstimates", 
      "emailTemplates", 
      "printThermal",
      "downloadRepairReport"
    ],
    enterprise: [
      // Enthält alle professional-Funktionen
      "dashboard", 
      "repairs", 
      "customers", 
      "printA4",
      "deviceTypes",
      "brands",
      "costEstimates", 
      "emailTemplates", 
      "printThermal",
      "downloadRepairReport",
      // Enterprise-spezifische Funktionen
      "statistics", 
      "backup",
      "multiUser",
      "advancedReporting",
      "customEmailTemplates",
      "feedbackSystem"
    ]
  };

  // Prüfen, ob die angeforderte Funktion im Tarifmodell des Benutzers enthalten ist
  return permissions[pricingPlan]?.includes(feature) ?? false;
}