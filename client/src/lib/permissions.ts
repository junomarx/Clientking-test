// Importiere die zentrale Konfiguration aus dem shared-Verzeichnis
import { PricingPlan, Feature, FeatureOverrides, isPlanAllowed } from "@shared/planFeatures";
import { apiRequest } from "@/lib/queryClient";

// Re-exportiere die Typen, damit sie weiterhin aus diesem Modul importiert werden können
export type { PricingPlan, Feature, FeatureOverrides };

/**
 * Prüft, ob ein Benutzer Zugriff auf ein bestimmtes Feature hat
 * Alle authentifizierten Benutzer haben vollständigen Zugriff
 * 
 * @param user Der Benutzer, für den die Berechtigung geprüft werden soll
 * @param feature Das zu prüfende Feature
 * @returns true wenn der Benutzer authentifiziert ist, sonst false
 */
export async function hasAccessClientAsync(user: any, feature: string): Promise<boolean> {
  return !!user;
}

/**
 * Synchrone Version der Berechtigungsprüfung
 * Alle Benutzer haben vollständigen Zugriff
 * 
 * @param plan Das Preispaket des Benutzers (nicht mehr verwendet)
 * @param feature Das zu prüfende Feature (nicht mehr verwendet)
 * @param featureOverrides Optionale Feature-Übersteuerungen (nicht mehr verwendet)
 * @returns true immer
 */
export function hasAccessClient(plan?: PricingPlan, feature?: Feature, featureOverrides?: FeatureOverrides | null) {
  return true;
}
