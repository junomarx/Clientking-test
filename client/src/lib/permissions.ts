import { User, type PricingPlan } from "@shared/schema";

/**
 * Prüft, ob ein Benutzer Zugriff auf eine bestimmte Funktion hat
 * basierend auf seinem Tarifmodell (basic, professional, enterprise)
 * Der Admin-Benutzer "bugi" hat immer Zugriff auf alle Funktionen.
 * 
 * @param user Der Benutzer, dessen Berechtigungen geprüft werden sollen
 * @param feature Die Funktion, für die die Berechtigung geprüft werden soll
 * @returns true wenn der Benutzer Zugriff hat, sonst false
 */
export function hasAccess(user: User | null, feature: string): boolean {
  // Wenn kein Benutzer übergeben wurde oder nicht eingeloggt ist
  if (!user) return false;
  
  // Admin-Benutzer hat immer Zugriff auf alle Funktionen
  if (user.isAdmin || user.username === 'bugi') return true;

  const pricingPlan = user.pricingPlan as PricingPlan;
  
  // Funktionen nach Tarifmodell definieren
  const permissions: Record<string, string[]> = {
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
      "downloadRepairReport",
      // Enterprise-spezifische Funktionen
      "statistics", 
      "backup",
      "multiUser",
      "advancedReporting",
      "customEmailTemplates",
      "feedbackSystem"
    ]
  };

  // Prüfen, ob die angeforderte Funktion im Tarifmodell des Benutzers enthalten ist
  return permissions[pricingPlan]?.includes(feature) ?? false;
}

/**
 * Gibt eine Liste aller verfügbaren Funktionen für einen Benutzer zurück
 * 
 * @param user Der Benutzer
 * @returns Array mit allen verfügbaren Funktionen
 */
export function getAvailableFeatures(user: User | null): string[] {
  if (!user) return [];
  
  // Admin hat Zugriff auf alles
  if (user.isAdmin || user.username === 'bugi') {
    return [
      "dashboard", 
      "repairs", 
      "customers", 
      "printA4",
      "deviceTypes",
      "brands",
      "costEstimates", 
      "emailTemplates", 
      "printThermal",
      "downloadRepairReport",
      "statistics", 
      "backup",
      "multiUser",
      "advancedReporting",
      "customEmailTemplates",
      "feedbackSystem"
    ];
  }
  
  const pricingPlan = user.pricingPlan as PricingPlan;
  
  const permissions: Record<string, string[]> = {
    basic: [
      "dashboard", 
      "repairs", 
      "customers", 
      "printA4",
      "deviceTypes",
      "brands"
    ],
    professional: [
      "dashboard", 
      "repairs", 
      "customers", 
      "printA4",
      "deviceTypes",
      "brands",
      "costEstimates", 
      "emailTemplates", 
      "printThermal",
      "downloadRepairReport"
    ],
    enterprise: [
      "dashboard", 
      "repairs", 
      "customers", 
      "printA4",
      "deviceTypes",
      "brands",
      "costEstimates", 
      "emailTemplates", 
      "printThermal",
      "downloadRepairReport",
      "statistics", 
      "backup",
      "multiUser",
      "advancedReporting",
      "customEmailTemplates",
      "feedbackSystem"
    ]
  };
  
  return permissions[pricingPlan] || [];
}

/**
 * Gibt den deutschen Display-Namen für ein Preispaket zurück
 */
export function getPricingPlanDisplayName(pricingPlan: string): string {
  const displayNames: Record<string, string> = {
    basic: "Basic",
    professional: "Professional",
    enterprise: "Enterprise"
  };
  
  return displayNames[pricingPlan] || pricingPlan;
}

/**
 * Gibt den deutschen Namen für ein Feature zurück
 */
export function getFeatureDisplayName(feature: string): string {
  const displayNames: Record<string, string> = {
    dashboard: "Dashboard",
    repairs: "Reparaturen",
    customers: "Kunden",
    printA4: "A4-Ausdruck",
    deviceTypes: "Gerätetypen",
    brands: "Marken",
    costEstimates: "Kostenvoranschläge",
    emailTemplates: "E-Mail-Vorlagen",
    printThermal: "Thermo-Bon",
    downloadRepairReport: "Reparaturbericht",
    statistics: "Erweiterte Statistiken",
    backup: "Daten-Backup",
    multiUser: "Multi-User",
    advancedReporting: "Erweiterte Berichte",
    customEmailTemplates: "Benutzerdefinierte E-Mail-Vorlagen",
    feedbackSystem: "Kundenbewertungen"
  };
  
  return displayNames[feature] || feature;
}