import type { Feature } from "./permissions";

/**
 * Diese Konfiguration definiert, welche Features in welchem Tarifplan enthalten sind.
 * Sie dient als zentrale Quelle für alle Tarifplan-basierten Berechtigungen im System.
 */
export type PricingPlan = "basic" | "professional" | "enterprise";

/**
 * Struktur für die Tarif-Feature-Matrix
 */
export type PlanFeaturesConfig = {
  [plan in PricingPlan]: Feature[];
};

/**
 * Zentrale Zuordnung von Features zu Tarifen
 */
export const planFeatures: PlanFeaturesConfig = {
  basic: [
    "dashboard",
    "repairs",
    "printA4"
  ],
  professional: [
    "dashboard",
    "repairs",
    "printA4",
    "costEstimates",
    "emailTemplates",
    "print58mm"
  ],
  enterprise: [
    "dashboard",
    "repairs",
    "printA4",
    "costEstimates",
    "emailTemplates",
    "print58mm",
    "statistics",
    "backup",
    "advancedSearch",
    "apiAccess"
  ]
};

/**
 * Prüft, ob ein Feature in einem bestimmten Tarif enthalten ist
 * @param plan Der Tarifplan (basic, professional, enterprise)
 * @param feature Das zu prüfende Feature
 * @returns true wenn das Feature im Tarif enthalten ist, sonst false
 */
export function isPlanAllowed(plan: PricingPlan, feature: Feature): boolean {
  if (!plan || !planFeatures[plan]) return false;
  
  return planFeatures[plan].includes(feature);
}
