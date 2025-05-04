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
  // Wenn kein Benutzer übergeben wurde
  if (!user) return false;
  
  // Admin-Benutzer hat immer Zugriff auf alle Funktionen
  if (user.isAdmin || user.username === 'bugi') return true;

  // 1. Asynchrone API-Anfrage an den Server für Paketberechtigungen
  try {
    const response = await apiRequest('GET', `/api/check-feature-access?feature=${feature}`);
    const result = await response.json();
    return result.hasAccess || false;
  } catch (error) {
    console.error('Fehler bei der Überprüfung der Paket-Features:', error);
    
    // Bei Fehler Fallback auf lokale Prüfung
    return hasAccessClient(user.pricingPlan as PricingPlan, feature as Feature, 
      typeof user.featureOverrides === 'string' ? JSON.parse(user.featureOverrides) : null);
  }
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
  // 1. Prüfe zuerst, ob es für dieses Feature eine individuelle Übersteuerung gibt
  if (featureOverrides && feature in featureOverrides) {
    return featureOverrides[feature] === true;
  }
  
  // 2. Wenn keine Übersteuerung definiert ist, prüfe anhand der zentralen Tarif-Feature-Matrix
  return isPlanAllowed(plan, feature);
}
