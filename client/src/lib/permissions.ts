// Importiere die zentrale Konfiguration aus dem shared-Verzeichnis
import { PricingPlan, Feature, FeatureOverrides, isPlanAllowed } from "@shared/planFeatures";

// Re-exportiere die Typen, damit sie weiterhin aus diesem Modul importiert werden können
export type { PricingPlan, Feature, FeatureOverrides };

/**
 * Prüft, ob ein Benutzer Zugriff auf ein bestimmtes Feature hat,
 * basierend auf seinem Preispaket und eventuellen Feature-Übersteuerungen
 * 
 * @param plan Das Preispaket des Benutzers
 * @param feature Das zu prüfende Feature
 * @param featureOverrides Optionale Feature-Übersteuerungen des Benutzers
 * @returns true wenn der Benutzer Zugriff hat, sonst false
 */
export function hasAccessClient(plan: PricingPlan, feature: Feature, featureOverrides?: FeatureOverrides | null) {
  // 1. Prüfe zuerst, ob es für dieses Feature eine individuelle Übersteuerung gibt
  if (featureOverrides && feature in featureOverrides) {
    return featureOverrides[feature] === true;
  }
  
  // 2. Wenn keine Übersteuerung definiert ist, prüfe anhand der zentralen Tarif-Feature-Matrix
  return isPlanAllowed(plan, feature);
}
