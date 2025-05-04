import { User } from "@shared/schema";

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

  const pricingPlan = user.pricingPlan as string;
  
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
    
    // Prüfen, ob der Benutzer das Enterprise-Paket hat
    return user.pricingPlan === 'enterprise';
  } catch (error) {
    console.error('Fehler beim Prüfen des Benutzer-Pakets:', error);
    return false;
  }
}