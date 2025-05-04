import { useAuth } from "@/hooks/use-auth";
import { hasAccessClient as hasAccess, hasAccessClientAsync, Feature } from "@/lib/permissions";
import { useState, useEffect } from "react";
import { UpgradeRequiredDialog } from "./UpgradeRequiredDialog";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";

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
  const [hasFeatureAccess, setHasFeatureAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Asynchrone Überprüfung des Feature-Zugriffs
  useEffect(() => {
    async function checkAccess() {
      setIsLoading(true);
      
      // Für nicht angemeldete Benutzer
      if (!user) {
        setHasFeatureAccess(false);
        setIsLoading(false);
        return;
      }
      
      // Admin hat immer Zugriff (schnelle lokale Prüfung)
      if (user.isAdmin || user.username === 'bugi') {
        setHasFeatureAccess(true);
        setIsLoading(false);
        return;
      }
      
      try {
        // Server-seitige Prüfung (berücksichtigt das neue Paketsystem)
        const hasAccess = await hasAccessClientAsync(user, feature);
        setHasFeatureAccess(hasAccess);
      } catch (error) {
        console.error('Fehler bei der Feature-Zugriffsprüfung:', error);
        
        // Fallback auf lokale Prüfung bei Server-Fehlern
        const fallbackAccess = checkUserAccessSync(user, feature);
        setHasFeatureAccess(fallbackAccess);
      }
      
      setIsLoading(false);
    }
    
    checkAccess();
  }, [user, feature]);
  
  // Lade-Indikator während der Prüfung
  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
      </div>
    );
  }
  
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
  const [hasFeatureAccess, setHasFeatureAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Asynchrone Überprüfung des Feature-Zugriffs
  useEffect(() => {
    async function checkAccess() {
      setIsLoading(true);
      
      // Für nicht angemeldete Benutzer
      if (!user) {
        setHasFeatureAccess(false);
        setIsLoading(false);
        return;
      }
      
      // Admin hat immer Zugriff (schnelle lokale Prüfung)
      if (user.isAdmin || user.username === 'bugi') {
        setHasFeatureAccess(true);
        setIsLoading(false);
        return;
      }
      
      try {
        // Server-seitige Prüfung (berücksichtigt das neue Paketsystem)
        const hasAccess = await hasAccessClientAsync(user, feature);
        setHasFeatureAccess(hasAccess);
      } catch (error) {
        console.error('Fehler bei der Feature-Zugriffsprüfung:', error);
        
        // Fallback auf lokale Prüfung bei Server-Fehlern
        const fallbackAccess = checkUserAccessSync(user, feature);
        setHasFeatureAccess(fallbackAccess);
      }
      
      setIsLoading(false);
    }
    
    checkAccess();
  }, [user, feature]);
  
  // Dialog-Komponente für Upgrade-Hinweis
  const UpgradeDialog = () => (
    <UpgradeRequiredDialog 
      open={showUpgradeDialog} 
      onClose={() => setShowUpgradeDialog(false)} 
      requiredPlan={requiredPlan} 
    />
  );
  
  return {
    hasAccess: hasFeatureAccess === true,
    isLoading,
    checkAccess: () => setShowUpgradeDialog(true),
    UpgradeDialog
  };
}

/**
 * Synchrone Hilfsfunktion zur Prüfung des Benutzer-Zugriffs als Fallback
 */
function checkUserAccessSync(user: UserResponse | null, feature: string): boolean {
  if (!user) return false;
  
  // Admin-Benutzer hat immer Zugriff auf alle Funktionen
  if (user.isAdmin || user.username === 'bugi') return true;
  
  // Parse featureOverrides aus JSON-String, falls vorhanden
  let parsedOverrides: any = null;
  if (user.featureOverrides && typeof user.featureOverrides === 'string') {
    try {
      parsedOverrides = JSON.parse(user.featureOverrides);
    } catch (e) {
      console.warn(`Fehler beim Parsen der Feature-Übersteuerungen:`, e);
    }
  }
  
  // Konvertiere pricingPlan und featureOverrides in die korrekten Typen für die hasAccess Funktion
  return hasAccess(
    user.pricingPlan as any, 
    feature as Feature, 
    parsedOverrides
  );
}
