/**
 * Diese Datei enthält die zentrale Konfiguration für Feature-Zuordnungen zu Tarifen.
 * Sie wird sowohl vom Client als auch vom Server verwendet, um die Berechtigungen konsistent zu halten.
 */

// Typ für die verfügbaren Tarifpläne
export type PricingPlan = "basic" | "professional" | "enterprise";

// Typ für die verfügbaren Features
export type Feature =
  // Basic Features
  | "dashboard"
  | "repairs"
  | "customers"
  | "printA4"
  | "deviceTypes"
  | "brands"
  // Professional Features
  | "costEstimates"
  | "emailTemplates"
  | "print58mm"
  | "printThermal"
  | "downloadRepairReport" 
  // Enterprise Features
  | "statistics"
  | "backup"
  | "advancedSearch"
  | "apiAccess"
  | "multiUser"
  | "advancedReporting"
  | "customEmailTemplates"
  | "feedbackSystem";

// Typ für die Feature-Override-Konfiguration eines Benutzers
export type FeatureOverrides = Partial<Record<Feature, boolean>>;

// Typ für die Zuordnung von Features zu Tarifen
export type PlanFeaturesConfig = {
  [plan in PricingPlan]: Feature[];
};

/**
 * Zentrale Konfiguration aller Features je Tarifplan
 */
export const planFeatures: PlanFeaturesConfig = {
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
    "print58mm",
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
    "print58mm",
    "downloadRepairReport",
    // Enterprise-spezifische Funktionen
    "statistics", 
    "backup",
    "advancedSearch",
    "apiAccess",
    "multiUser",
    "advancedReporting",
    "customEmailTemplates",
    "feedbackSystem"
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
