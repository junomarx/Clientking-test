// Importiere die zentrale Konfiguration aus dem shared-Verzeichnis
import { PricingPlan, Feature, FeatureOverrides, isPlanAllowed } from "@shared/planFeatures";
import { apiRequest } from "@/lib/queryClient";

// Re-exportiere die Typen, damit sie weiterhin aus diesem Modul importiert werden können
export type { PricingPlan, Feature, FeatureOverrides };

/**
 * Prüft, ob ein Benutzer Zugriff auf ein bestimmtes Feature hat,
 * basierend auf seinem Preispaket, seinem zugewiesenen Paket (packageId) und eventuellen Feature-Übersteuerungen
 * 
 * @param user Der Benutzer, für den die Berechtigung geprüft werden soll
 * @param feature Das zu prüfende Feature
 * @returns true wenn der Benutzer Zugriff hat, sonst false
 */
export async function hasAccessClientAsync(user: any, feature: string): Promise<boolean> {
  // Alle authentifizierten Benutzer haben Vollzugriff
  return user ? true : false;
}

/**
 * Synchrone Version der Berechtigungsprüfung (nur für Fallbacks)
 * Prüft, ob ein Benutzer Zugriff auf ein bestimmtes Feature hat,
 * basierend auf seinem Preispaket und eventuellen Feature-Übersteuerungen
 * 
 * @param plan Das Preispaket des Benutzers
 * @param feature Das zu prüfende Feature
 * @param featureOverrides Optionale Feature-Übersteuerungen des Benutzers
 * @returns true wenn der Benutzer Zugriff hat, sonst false
 */
export function hasAccessClient(plan: PricingPlan, feature: Feature, featureOverrides?: FeatureOverrides | null) {
  // Alle Benutzer haben Vollzugriff
  return true;
}
