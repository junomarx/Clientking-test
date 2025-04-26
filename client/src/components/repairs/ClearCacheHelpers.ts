// Hilfsfunktionen zum Löschen von gespeicherten Daten im localStorage

// Konstanten für die lokalStorage-Schlüssel
const SAVED_MODELS_KEY = 'repair-shop-models';
const SAVED_BRANDS_KEY = 'repair-shop-brands';

// Funktion zum Löschen aller gespeicherten Marken
export function clearAllBrands(): void {
  try {
    localStorage.removeItem(SAVED_BRANDS_KEY);
    console.log('Alle gespeicherten Marken wurden gelöscht.');
  } catch (err) {
    console.error('Fehler beim Löschen der Marken aus dem localStorage:', err);
  }
}

// Funktion zum Löschen aller gespeicherten Modelle
export function clearAllModels(): void {
  try {
    localStorage.removeItem(SAVED_MODELS_KEY);
    console.log('Alle gespeicherten Modelle wurden gelöscht.');
  } catch (err) {
    console.error('Fehler beim Löschen der Modelle aus dem localStorage:', err);
  }
}

// Funktion zum Löschen aller Daten im localStorage
export function clearAllLocalStorage(): void {
  try {
    localStorage.clear();
    console.log('Der gesamte localStorage wurde gelöscht.');
  } catch (err) {
    console.error('Fehler beim Löschen des gesamten localStorage:', err);
  }
}

// Funktion zum Anzeigen aller gespeicherten Daten
export function showAllStoredData(): void {
  try {
    const brands = localStorage.getItem(SAVED_BRANDS_KEY);
    const models = localStorage.getItem(SAVED_MODELS_KEY);
    
    console.log('Gespeicherte Marken:', brands ? JSON.parse(brands) : 'Keine');
    console.log('Gespeicherte Modelle:', models ? JSON.parse(models) : 'Keine');
  } catch (err) {
    console.error('Fehler beim Anzeigen der gespeicherten Daten:', err);
  }
}

// Exportiere auch eine globale Funktion, die in der Browserkonsole verwendet werden kann
if (typeof window !== 'undefined') {
  (window as any).clearRepairShopCache = function() {
    clearAllBrands();
    clearAllModels();
    console.log('Cache für Gerätearten und Marken wurde gelöscht.');
  };
  
  (window as any).showRepairShopCache = function() {
    showAllStoredData();
  };
}