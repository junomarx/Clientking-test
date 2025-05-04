import React from "react";
import { useFeatureAccess } from "@/components/common/RequireFeature";
import { Button } from "@/components/ui/button";
import { LockIcon, Receipt, FileText } from "lucide-react";

interface ProfessionalFeatureGuardProps {
  children: React.ReactNode;
  feature: "costEstimates" | "emailTemplates" | "printThermal" | "downloadRepairReport";
  title: string;
  description: string;
  bulletPoints?: string[];
}

/**
 * ProfessionalFeatureGuard
 * 
 * Diese Komponente prüft, ob der Benutzer Zugriff auf Professional-Features hat.
 * Wenn nicht, wird ein Upgrade-Dialog angezeigt und eine vereinfachte Ansicht gerendert.
 */
export function ProfessionalFeatureGuard({ 
  children, 
  feature, 
  title,
  description,
  bulletPoints = []
}: ProfessionalFeatureGuardProps) {
  // Benutze den useFeatureAccess Hook um zu prüfen, ob der Benutzer Zugriff auf das Feature hat
  const { hasAccess, checkAccess, UpgradeDialog } = useFeatureAccess(feature, "professional");
  
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
          <span>{title}</span>
        </div>
        
        <p className="text-muted-foreground">
          {description}
        </p>
        
        {bulletPoints.length > 0 && (
          <ul className="list-disc list-inside text-sm text-muted-foreground pl-4 space-y-1">
            {bulletPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        )}
        
        <Button 
          onClick={() => checkAccess()}
          className="mt-4"
        >
          Zum Professional-Paket upgraden
        </Button>
      </div>
      
      {/* Upgrade-Dialog Komponente einbinden */}
      <UpgradeDialog />
    </>
  );
}

/**
 * Spezifische Feature-Guards für häufig verwendete Professional-Features
 */

export function CostEstimatesGuard({ children }: { children: React.ReactNode }) {
  return (
    <ProfessionalFeatureGuard
      feature="costEstimates"
      title="Kostenvoranschläge"
      description="Die Erstellung und Verwaltung von Kostenvoranschlägen ist im Professional-Paket enthalten."
      bulletPoints={[
        "Professionelle PDF-Kostenvoranschläge erstellen",
        "Kostenvoranschläge per E-Mail versenden",
        "Mit einem Klick in Reparaturaufträge umwandeln",
        "Kostenvoranschläge verfolgen und verwalten",
        "Positionen mit individuellen Preisen erstellen"
      ]}
    >
      {children}
    </ProfessionalFeatureGuard>
  );
}

export function EmailTemplatesGuard({ children }: { children: React.ReactNode }) {
  return (
    <ProfessionalFeatureGuard
      feature="emailTemplates"
      title="E-Mail-Vorlagen"
      description="Die Verwaltung von E-Mail-Vorlagen ist im Professional-Paket enthalten."
      bulletPoints={[
        "E-Mail-Vorlagen für verschiedene Anlässe erstellen",
        "Platzhalter für dynamische Inhalte verwenden",
        "Vorlagen organisieren und verwalten",
        "Professionelles Erscheinungsbild",
        "Zeit sparen durch wiederverwendbare Vorlagen"
      ]}
    >
      {children}
    </ProfessionalFeatureGuard>
  );
}

export function ThermalPrintGuard({ children }: { children: React.ReactNode }) {
  return (
    <ProfessionalFeatureGuard
      feature="printThermal"
      title="Thermodruck"
      description="Der Druck von Bondrucker-Belegen ist im Professional-Paket enthalten."
      bulletPoints={[
        "Kompakte 58mm und 80mm Bons drucken",
        "Schneller Ausdruck von Abholscheinen",
        "Platzsparende Alternative zu A4-Ausdrucken",
        "Professionelle Kunden-Belegausgabe",
        "Angepasstes Layout mit Firmenlogo"
      ]}
    >
      {children}
    </ProfessionalFeatureGuard>
  );
}

export function RepairReportGuard({ children }: { children: React.ReactNode }) {
  return (
    <ProfessionalFeatureGuard
      feature="downloadRepairReport"
      title="Reparaturberichte"
      description="Der Download von detaillierten Reparaturberichten ist im Professional-Paket enthalten."
      bulletPoints={[
        "Detaillierte PDF-Reparaturberichte",
        "Statistiken zu erledigten Reparaturen",
        "Umsatz- und Kundenzahlen",
        "Export-Funktionen für Ihre Buchhaltung",
        "Filtern nach Zeiträumen und Kategorien"
      ]}
    >
      {children}
    </ProfessionalFeatureGuard>
  );
}