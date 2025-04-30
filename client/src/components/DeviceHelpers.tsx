// Diese Datei enthält Hilfsfunktionen, die den Übergang von localStorage zu API-basierten Funktionen erleichtern
// Sie kann gelöscht werden, sobald die vollständige Migration abgeschlossen ist

import React from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Ersatz für localStorage-basierte clearAllModels Funktion
 * Zeigt einen Toast an, da diese Funktion nicht mehr direkt zum Löschen von Modellen verwendet werden sollte
 */
export function ClearAllModelsButton() {
  const { toast } = useToast();
  
  const handleClick = () => {
    toast({
      title: "Hinweis",
      description: "Diese Funktion wurde zur Datenbank-Unterstützung aktualisiert und steht in zukünftigen Versionen zur Verfügung.",
      variant: "default"
    });
  };
  
  return (
    <button 
      type="button"
      className="text-destructive"
      onClick={handleClick}
    >
      Alle löschen
    </button>
  );
}

/**
 * Ersatz für localStorage-basierte deleteModel Funktion
 * Zeigt einen Toast an, da diese Funktion nicht mehr direkt zum Löschen von Modellen verwendet werden sollte
 */
export function DeleteModelButton({ model }: { model: string }) {
  const { toast } = useToast();
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Hinweis",
      description: "Diese Funktion wurde zur Datenbank-Unterstützung aktualisiert und steht in zukünftigen Versionen zur Verfügung.",
      variant: "default"
    });
  };
  
  return (
    <button
      type="button"
      className="text-destructive hover:bg-destructive hover:text-white rounded-full w-5 h-5 flex items-center justify-center"
      onClick={handleClick}
    >
      ×
    </button>
  );
}

// Standardwerte für häufig verwendete Marken
export const defaultBrands: { [key: string]: string[] } = {
  smartphone: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google', 'Sony', 'LG', 'Motorola', 'Nokia'],
  tablet: ['Apple', 'Samsung', 'Huawei', 'Lenovo', 'Microsoft', 'Amazon', 'Asus', 'Acer', 'LG'],
  laptop: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Microsoft', 'Samsung', 'MSI', 'Razer', 'Toshiba'],
  smartwatch: ['Apple', 'Samsung', 'Fitbit', 'Garmin', 'Huawei', 'Fossil', 'TicWatch', 'Amazfit', 'Withings'],
  kopfhörer: ['Apple', 'Bose', 'Sony', 'Sennheiser', 'JBL', 'Beats', 'Samsung', 'Skullcandy', 'Jabra', 'Audio-Technica'],
  konsole: ['Sony', 'Microsoft', 'Nintendo', 'Sega', 'Atari'],
};

// Kompatibilitätsfunktion für alte localStorage-basierte Funktionen
export function getBrandsForDeviceType(deviceType: string): string[] {
  const deviceTypeLower = deviceType.toLowerCase();
  return defaultBrands[deviceTypeLower] || [];
}