import React from "react";
import { useFeatureAccess } from "@/components/common/RequireFeature";
import { Button } from "@/components/ui/button";
import { LockIcon } from "lucide-react";

interface EnterpriseStatsGuardProps {
  children: React.ReactNode;
}

/**
 * EnterpriseStatsGuard
 * 
 * Diese Komponente prüft, ob der Benutzer Zugriff auf detaillierte Statistiken hat (Enterprise-Feature).
 * Wenn nicht, wird ein Upgrade-Dialog angezeigt und eine vereinfachte Ansicht gerendert.
 */
export function EnterpriseStatsGuard({ children }: EnterpriseStatsGuardProps) {
  // Benutze den useFeatureAccess Hook um zu prüfen, ob der Benutzer Zugriff auf die Statistik hat
  const { hasAccess, checkAccess, UpgradeDialog } = useFeatureAccess("statistics", "enterprise");
  
  // Wenn der Benutzer Zugriff hat, zeige den vollständigen Inhalt
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Ansonsten zeige eine eingeschränkte Ansicht und den Upgrade-Dialog
  return (
    <>
      <div className="p-6 border rounded-lg bg-muted/30 space-y-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          <LockIcon className="h-5 w-5 text-amber-500" />
          <span>Erweiterte Statistiken</span>
        </div>
        
        <p className="text-muted-foreground">
          Die detaillierten Statistiken und Analysen sind nur im Enterprise-Paket verfügbar.
          Upgraden Sie jetzt, um Zugriff auf umfassende Auswertungen zu erhalten:
        </p>
        
        <ul className="list-disc list-inside text-sm text-muted-foreground pl-4 space-y-1">
          <li>Umsatzentwicklung auf Monats- und Tagesbasis</li>
          <li>Top-Gerätetypen und -Marken</li>
          <li>Durchschnittliche Reparaturdauer</li>
          <li>Vergleichsanalysen</li>
          <li>Exportfunktionen für Excel und PDF</li>
        </ul>
        
        <Button 
          onClick={() => checkAccess()}
          className="mt-4"
        >
          Zum Enterprise-Paket upgraden
        </Button>
      </div>
      
      {/* Upgrade-Dialog Komponente einbinden */}
      <UpgradeDialog />
    </>
  );
}