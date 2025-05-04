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

export function hasAccessClient(plan: PricingPlan, feature: Feature) {
  const order: PricingPlan[] = ["basic", "professional", "enterprise"];
  return order.indexOf(plan) >= order.indexOf(accessMatrix[feature]);
}
