import { User } from "@shared/schema";

// Vereinfachtes Berechtigungssystem - alle Benutzer haben Vollzugriff
// Das komplexe paketbasierte System wurde entfernt

/**
 * Prüft, ob ein Benutzer Zugriff auf eine bestimmte Funktion hat.
 * Im neuen System haben alle authentifizierten Benutzer Vollzugriff.
 * 
 * @param user Der Benutzer, dessen Berechtigungen geprüft werden sollen
 * @param feature Die Funktion, für die die Berechtigung geprüft werden soll
 * @returns true wenn der Benutzer authentifiziert ist, sonst false
 */
export async function hasAccessAsync(user: User | null | undefined, feature: string): Promise<boolean> {
  // Wenn kein Benutzer übergeben wurde
  if (!user) return false;
  
  // Alle authentifizierten Benutzer haben Vollzugriff
  return true;
}

/**
 * Synchrone Version der Berechtigungsprüfung
 */
export function hasAccess(user: User | null | undefined, feature: string): boolean {
  if (!user) return false;
  return true;
}

/**
 * Prüft, ob ein Benutzer auf detaillierte Statistiken zugreifen kann
 */
export async function canViewDetailedStats(user: User | null | undefined): Promise<boolean> {
  return hasAccessAsync(user, 'detailedStats');
}

/**
 * Gibt die maximale Anzahl von Reparaturen zurück (praktisch unbegrenzt)
 */
export async function getMaxRepairs(user: User | null | undefined): Promise<number> {
  if (!user) return 0;
  return 10000; // Praktisch unbegrenzt
}

/**
 * Legacy-Funktionen für Rückwärtskompatibilität
 */
export function clearPermissionsCache(): void {
  console.log("Cache-Leerung - nicht mehr nötig im Vollzugriff-System");
}

export function invalidateUserPermissionsCache(userId: number): void {
  console.log(`Cache-Invalidierung für Benutzer ${userId} - nicht mehr nötig im Vollzugriff-System`);
}