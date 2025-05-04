import { User } from "@shared/schema";
import { Feature, PricingPlan, isPlanAllowed } from "@shared/planFeatures";

/**
 * Prüft, ob ein Benutzer Zugriff auf eine bestimmte Funktion hat,
 * basierend auf seinem Tarifmodell (basic, professional, enterprise).
 * Der Admin-Benutzer "bugi" hat immer Zugriff auf alle Funktionen.
 * 
 * @param user Der Benutzer, dessen Berechtigungen geprüft werden sollen
 * @param feature Die Funktion, für die die Berechtigung geprüft werden soll
 * @returns true wenn der Benutzer Zugriff hat, sonst false
 */
export function hasAccess(user: User | null | undefined, feature: string): boolean {
  // Wenn kein Benutzer übergeben wurde
  if (!user) return false;
  
  // Admin-Benutzer hat immer Zugriff auf alle Funktionen
  if (user.isAdmin || user.username === 'bugi') return true;

  // Prüfen, ob für dieses Feature eine individuelle Übersteuerung existiert
  if (user.featureOverrides && typeof user.featureOverrides === 'string') {
    try {
      const overrides = JSON.parse(user.featureOverrides);
      if (feature in overrides) {
        return overrides[feature] === true;
      }
    } catch (e) {
      console.warn(`Fehler beim Parsen der Feature-Übersteuerungen für Benutzer ${user.id}:`, e);
      // Bei Fehlern im JSON wird der Standard-Prüfmechanismus verwendet
    }
  }

  // Wenn keine Übersteuerung definiert ist, prüfe anhand der zentralen Feature-Matrix
  const pricingPlan = user.pricingPlan as PricingPlan;
  return isPlanAllowed(pricingPlan, feature as Feature);
}

/**
 * Prüft, ob der Benutzer mindestens das Professional-Paket hat
 */
export async function isProfessionalOrHigher(userId: number): Promise<boolean> {
  try {
    // Benutzer aus der Datenbank abrufen
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    
    if (!user) return false;
    
    // Admin-Benutzer hat immer Zugriff
    if (user.isAdmin || user.username === 'bugi') return true;
    
    // Prüfe auf Feature-Übersteuerungen für Professional-Features
    if (user.featureOverrides && typeof user.featureOverrides === 'string') {
      try {
        const overrides = JSON.parse(user.featureOverrides);
        // Prüfen, ob mindestens eines der Professional-Features erlaubt ist
        if (overrides.costEstimates === true || overrides.emailTemplates === true) {
          return true;
        }
      } catch (e) {
        console.warn(`Fehler beim Parsen der Feature-Übersteuerungen für Benutzer ${user.id}:`, e);
      }
    }
    
    // Prüfen, ob der Benutzer mindestens das Professional-Paket hat
    return ['professional', 'enterprise'].includes(user.pricingPlan);
  } catch (error) {
    console.error('Fehler beim Prüfen des Benutzer-Pakets:', error);
    return false;
  }
}

/**
 * Prüft, ob der Benutzer das Enterprise-Paket hat
 */
export async function isEnterprise(userId: number): Promise<boolean> {
  try {
    // Benutzer aus der Datenbank abrufen
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    
    if (!user) return false;
    
    // Admin-Benutzer hat immer Zugriff
    if (user.isAdmin || user.username === 'bugi') return true;
    
    // Prüfe auf Feature-Übersteuerungen für Enterprise-Features
    if (user.featureOverrides && typeof user.featureOverrides === 'string') {
      try {
        const overrides = JSON.parse(user.featureOverrides);
        // Prüfen, ob mindestens eines der Enterprise-Features erlaubt ist
        if (overrides.statistics === true || overrides.backup === true) {
          return true;
        }
      } catch (e) {
        console.warn(`Fehler beim Parsen der Feature-Übersteuerungen für Benutzer ${user.id}:`, e);
      }
    }
    
    // Prüfen, ob der Benutzer das Enterprise-Paket hat
    return user.pricingPlan === 'enterprise';
  } catch (error) {
    console.error('Fehler beim Prüfen des Benutzer-Pakets:', error);
    return false;
  }
}