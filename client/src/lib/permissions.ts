export type PricingPlan = "basic" | "professional" | "enterprise";
export type Feature =
  | "backup"
  | "emailTemplates"
  | "costEstimates"
  | "analytics"
  | "prioritySupport"
  | "statistics"
  | "printThermal"
  | "downloadRepairReport";

const accessMatrix: Record<Feature, PricingPlan> = {
  backup: "enterprise",
  emailTemplates: "professional",
  costEstimates: "professional",
  analytics: "enterprise",
  prioritySupport: "enterprise",
  statistics: "enterprise",
  printThermal: "professional",
  downloadRepairReport: "professional"
};

// Typdefinition für die featureOverrides in der User-Tabelle
export type FeatureOverrides = Partial<Record<Feature, boolean>>;

export function hasAccessClient(plan: PricingPlan, feature: Feature, featureOverrides?: FeatureOverrides | null) {
  // Überprüfe zuerst, ob es für dieses Feature eine individuelle Übersteuerung gibt
  if (featureOverrides && feature in featureOverrides) {
    return featureOverrides[feature] === true;
  }
  
  // Wenn keine Übersteuerung definiert ist, prüfe anhand des Preispakets
  const order: PricingPlan[] = ["basic", "professional", "enterprise"];
  return order.indexOf(plan) >= order.indexOf(accessMatrix[feature]);
}
