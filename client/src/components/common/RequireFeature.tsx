import { useAuth } from "@/hooks/use-auth";
import { hasAccessClient as hasAccess, Feature } from "@/lib/permissions";
import { useState } from "react";
import { UpgradeRequiredDialog } from "./UpgradeRequiredDialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

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
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Prüfe, ob der Benutzer Zugriff auf die Funktion hat
  const hasFeatureAccess = user ? checkUserAccess(user, feature) : false;
  
  if (hasFeatureAccess) {
    // Wenn der Benutzer Zugriff hat, zeige den normalen Inhalt
    return <>{children}</>;
  }
  
  // Wenn ein Fallback bereitgestellt wurde, zeige diesen an
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Ansonsten zeige einen Platzhalter mit Upgrade-Möglichkeit
  return (
    <>
      <div 
        className="p-4 border rounded-md bg-muted/30 flex flex-col items-center justify-center gap-3 cursor-pointer"
        onClick={() => setShowUpgradeDialog(true)}
      >
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Diese Funktion ist nur im {requiredPlan === "professional" ? "Professional" : "Enterprise"}-Paket verfügbar.
        </p>
        <Button size="sm" variant="outline">
          Mehr erfahren
        </Button>
      </div>
      
      <UpgradeRequiredDialog 
        open={showUpgradeDialog} 
        onClose={() => setShowUpgradeDialog(false)} 
        requiredPlan={requiredPlan} 
      />
    </>
  );
}

/**
 * HOC (Higher-Order Component) für Komponenten, die eine bestimmte Funktion benötigen
 */
export function withFeatureAccess<P extends object>(
  Component: React.ComponentType<P>,
  feature: string,
  requiredPlan: "professional" | "enterprise"
) {
  return function WrappedComponent(props: P) {
    return (
      <RequireFeature feature={feature} requiredPlan={requiredPlan}>
        <Component {...props} />
      </RequireFeature>
    );
  };
}

/**
 * Hook zur Prüfung, ob der Benutzer Zugriff auf eine bestimmte Funktion hat
 * und zur Anzeige des Upgrade-Dialogs, wenn nicht
 */
export function useFeatureAccess(feature: string, requiredPlan: "professional" | "enterprise") {
  const { user } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Prüfe, ob der Benutzer Zugriff auf die Funktion hat
  const hasFeatureAccess = user ? checkUserAccess(user, feature) : false;
  
  // Dialog-Komponente für Upgrade-Hinweis
  const UpgradeDialog = () => (
    <UpgradeRequiredDialog 
      open={showUpgradeDialog} 
      onClose={() => setShowUpgradeDialog(false)} 
      requiredPlan={requiredPlan} 
    />
  );
  
  return {
    hasAccess: hasFeatureAccess,
    checkAccess: () => setShowUpgradeDialog(true),
    UpgradeDialog
  };
}

/**
 * Hilfsfunktion zur Prüfung des Benutzer-Zugriffs
 */
function checkUserAccess(user: UserResponse | null, feature: string): boolean {
  if (!user) return false;
  
  // Konvertiere pricingPlan und featureOverrides in die korrekten Typen für die hasAccess Funktion
  return hasAccess(
    user.pricingPlan as any, 
    feature as Feature, 
    user.featureOverrides as any
  );
}
