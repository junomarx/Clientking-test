import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Import der Display-Namen Funktionen
import { getPricingPlanDisplayName, getFeatureDisplayName } from "@/lib/permissions";
import { LockIcon, PackageOpenIcon, ChevronRightIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface UpgradeRequiredDialogProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  requiredPlan: "professional" | "enterprise";
}

/**
 * Zeigt einen Dialog an, wenn ein Benutzer versucht, auf eine Funktion zuzugreifen, 
 * die in seinem Tarif nicht enthalten ist.
 */
export function UpgradeRequiredDialog({
  open,
  onClose,
  feature,
  requiredPlan
}: UpgradeRequiredDialogProps) {
  const { user } = useAuth();
  const currentPlan = user?.pricingPlan || "basic";
  const featureDisplayName = getFeatureDisplayName(feature);
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockIcon className="w-5 h-5 text-amber-500" /> 
            <span>Upgrade erforderlich</span>
          </DialogTitle>
          <DialogDescription>
            Diese Funktion ist nur im {getPricingPlanDisplayName(requiredPlan)}-Tarif oder höher verfügbar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 border rounded-lg bg-muted/30 mb-4">
          <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
            <PackageOpenIcon className="w-5 h-5 text-primary" />
            <span>Funktion: {featureDisplayName}</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Ihr aktueller Tarif: <span className="font-medium">{getPricingPlanDisplayName(currentPlan)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Benötigter Tarif: <span className="font-medium">{getPricingPlanDisplayName(requiredPlan)}</span>
          </p>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>Schließen</Button>
          <Button onClick={onClose} className="gap-1">
            Zum {getPricingPlanDisplayName(requiredPlan)}-Tarif upgraden
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook zum einfachen Anzeigen des Upgrade-Dialogs
 */
export function useUpgradeDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    feature: string;
    requiredPlan: "professional" | "enterprise";
  }>({
    open: false,
    feature: "",
    requiredPlan: "professional"
  });
  
  const showUpgradeDialog = (feature: string, requiredPlan: "professional" | "enterprise") => {
    setDialogState({
      open: true,
      feature,
      requiredPlan
    });
  };
  
  const hideUpgradeDialog = () => {
    setDialogState(prev => ({ ...prev, open: false }));
  };
  
  const UpgradeDialog = () => (
    <UpgradeRequiredDialog
      open={dialogState.open}
      onClose={hideUpgradeDialog}
      feature={dialogState.feature}
      requiredPlan={dialogState.requiredPlan}
    />
  );
  
  return { showUpgradeDialog, hideUpgradeDialog, UpgradeDialog };
}