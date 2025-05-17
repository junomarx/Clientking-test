import { Package, PackageFeature, User } from "@shared/schema";
import { Feature, PricingPlan, isPlanAllowed } from "@shared/planFeatures";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { packageFeatures, packages } from "@shared/schema";

/**
 * Cache für Paket-Feature-Berechtigungen
 * Key: packageId_feature
 * Value: true/false
 */
const featureCache = new Map<string, boolean>();

/**
 * Prüft, ob ein Benutzer Zugriff auf eine bestimmte Funktion hat,
 * basierend auf seinem zugewiesenen Paket oder (als Fallback) auf dem alten Tarifmodell.
 * Der Admin-Benutzer "bugi" hat immer Zugriff auf alle Funktionen.
 * 
 * @param user Der Benutzer, dessen Berechtigungen geprüft werden sollen
 * @param feature Die Funktion, für die die Berechtigung geprüft werden soll
 * @returns true wenn der Benutzer Zugriff hat, sonst false
 */
export async function hasAccessAsync(user: User | null | undefined, feature: string): Promise<boolean> {
  // Wenn kein Benutzer übergeben wurde
  if (!user) return false;
  
  // Admin-Benutzer hat immer Zugriff auf alle Funktionen
  if (user.isAdmin || user.username === 'bugi') return true;

  // 1. Prüfen, ob ein Paket zugewiesen ist (neues System)
  if (user.packageId) {
    const cacheKey = `${user.packageId}_${feature}`;
    
    // Prüfen, ob das Ergebnis bereits im Cache ist
    if (featureCache.has(cacheKey)) {
      return featureCache.get(cacheKey) || false;
    }
    
    // Feature-Berechtigung für dieses Paket aus der Datenbank abrufen
    const features = await db.select()
      .from(packageFeatures)
      .where(eq(packageFeatures.packageId, user.packageId));
    
    // Prüfen, ob das Feature im Paket enthalten ist
    const hasFeature = features.some(f => f.feature === feature);
    
    // Ergebnis im Cache speichern
    featureCache.set(cacheKey, hasFeature);
    
    return hasFeature;
  }

  // 2. Fallback: Prüfen auf individuelle Übersteuerungen (altes System)
  if (user.featureOverrides && typeof user.featureOverrides === 'string') {
    try {
      const overrides = JSON.parse(user.featureOverrides);
      if (feature in overrides) {
        return overrides[feature] === true;
      }
    } catch (e) {
      console.warn(`Fehler beim Parsen der Feature-Übersteuerungen für Benutzer ${user.id}:`, e);
    }
  }

  // 3. Fallback: Alte Feature-Matrix verwenden (wenn kein Paket zugewiesen oder Feature nicht in Übersteuerungen)
  if (user.pricingPlan) {
    const pricingPlan = user.pricingPlan as PricingPlan;
    return isPlanAllowed(pricingPlan, feature as Feature);
  }
  
  // Standardmäßig keine Berechtigung
  return false;
}

/**
 * Synchrone Version von hasAccessAsync für Fälle, in denen keine asynchrone Prüfung möglich ist.
 * Diese Funktion verwendet nur die alten Methoden (featureOverrides und pricingPlan),
 * ohne Datenbankzugriff für das neue Paketsystem.
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
  if (user.pricingPlan) {
    const pricingPlan = user.pricingPlan as PricingPlan;
    return isPlanAllowed(pricingPlan, feature as Feature);
  }
  
  return false;
}

/**
 * Prüft, ob der Benutzer mindestens das Professional-Paket hat
 * oder Zugriff auf Professional-Features über das neue Paketsystem besitzt
 */
export async function isProfessionalOrHigher(userId: number): Promise<boolean> {
  try {
    // Benutzer aus der Datenbank abrufen
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);
    
    if (!user) return false;
    
    // Admin-Benutzer hat immer Zugriff
    if (user.isAdmin || user.username === 'bugi') return true;
    
    // 1. Prüfen, ob ein Paket zugewiesen ist (neues System)
    if (user.packageId) {
      const professionalFeatures = ['emailTemplates', 'printThermal', 'print58mm']; // 'costEstimates' entfernt für spätere Neuimplementierung
      
      // Features für dieses Paket aus der Datenbank abrufen
      const features = await db.select()
        .from(packageFeatures)
        .where(eq(packageFeatures.packageId, user.packageId));
        
      // Prüfen, ob mindestens eine der Professional-Features im Paket enthalten ist
      const hasProFeature = features.some(f => professionalFeatures.includes(f.feature));
      
      if (hasProFeature) {
        return true;
      }
    }
    
    // 2. Prüfe auf Feature-Übersteuerungen (altes System)
    if (user.featureOverrides && typeof user.featureOverrides === 'string') {
      try {
        const overrides = JSON.parse(user.featureOverrides);
        // Prüfen, ob mindestens eines der Professional-Features erlaubt ist
        if (overrides.emailTemplates === true) { // 'costEstimates' entfernt für spätere Neuimplementierung
          return true;
        }
      } catch (e) {
        console.warn(`Fehler beim Parsen der Feature-Übersteuerungen für Benutzer ${user.id}:`, e);
      }
    }
    
    // 3. Prüfen, ob der Benutzer mindestens das Professional-Paket im alten System hat
    return user.pricingPlan ? ['professional', 'enterprise'].includes(user.pricingPlan) : false;
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