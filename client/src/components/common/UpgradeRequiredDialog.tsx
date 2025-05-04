import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock } from "lucide-react";

interface UpgradeRequiredDialogProps {
  open: boolean;
  onClose: () => void;
  requiredPlan: "professional" | "enterprise";
}

export function UpgradeRequiredDialog({ open, onClose, requiredPlan }: UpgradeRequiredDialogProps) {
  // Ermittle die Features, die in dem jeweiligen Plan enthalten sind
  const professionalFeatures = [
    "Kostenvoranschläge erstellen und verwalten",
    "E-Mail-Vorlagen erstellen und bearbeiten", 
    "Thermodruckerfunktionen (58mm/80mm Bon-Format)",
    "Detaillierte PDF-Reparaturberichte",
    "Unbegrenzte Anzahl an Reparaturaufträgen"
  ];
  
  const enterpriseFeatures = [
    ...professionalFeatures,
    "Detaillierte Statistiken und Analysefunktionen",
    "Datensicherung und -wiederherstellung",
    "Prioritäts-Support",
    "Mehrere Standorte verwalten"
  ];
  
  const displayedFeatures = requiredPlan === "professional" ? professionalFeatures : enterpriseFeatures;
  const planName = requiredPlan === "professional" ? "Professional" : "Enterprise";
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5 text-amber-500" />
            Upgrade auf {planName}-Paket erforderlich
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-muted-foreground mb-4">
            Diese Funktion ist nur im <strong>{planName}-Paket</strong> oder höher verfügbar.
            Folgende Features sind in diesem Paket enthalten:
          </p>
          
          <ul className="space-y-2">
            {displayedFeatures.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Schließen</Button>
          <Button>
            Jetzt upgraden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
