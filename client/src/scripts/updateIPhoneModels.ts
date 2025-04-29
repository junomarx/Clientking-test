import { getModelsForDeviceAndBrand, saveModel, deleteModel } from '../lib/localStorage';

/**
 * Aktualisiert die iPhone-Modelle in der Smartphone -> Apple Auswahl
 * Löscht alle bisherigen Modelle und fügt die neuen Modelle hinzu
 */
export function updateAppleModels() {
  const deviceType = 'Smartphone';
  const brand = 'Apple';
  
  // Alle iPhone-Modelle, die hinzugefügt werden sollen
  const iPhoneModels = [
    'iPhone 5',
    'iPhone 5c',
    'iPhone 5s',
    'iPhone 6',
    'iPhone 6 Plus',
    'iPhone 6s',
    'iPhone 6s Plus',
    'iPhone SE (1. Generation)',
    'iPhone 7',
    'iPhone 7 Plus',
    'iPhone 8',
    'iPhone 8 Plus',
    'iPhone X',
    'iPhone XR',
    'iPhone XS',
    'iPhone XS Max',
    'iPhone 11',
    'iPhone 11 Pro',
    'iPhone 11 Pro Max',
    'iPhone SE (2. Generation)',
    'iPhone 12 mini',
    'iPhone 12',
    'iPhone 12 Pro',
    'iPhone 12 Pro Max',
    'iPhone 13 mini',
    'iPhone 13',
    'iPhone 13 Pro',
    'iPhone 13 Pro Max',
    'iPhone SE (3. Generation)',
    'iPhone 14',
    'iPhone 14 Plus',
    'iPhone 14 Pro',
    'iPhone 14 Pro Max',
    'iPhone 15',
    'iPhone 15 Plus',
    'iPhone 15 Pro',
    'iPhone 15 Pro Max',
    'iPhone 16',
    'iPhone 16 Plus',
    'iPhone 16 Pro',
    'iPhone 16 Pro Max',
    'iPhone 16e'
  ];
  
  // Hole aktuelle Modelle, um zu prüfen, ob wir sie ersetzen müssen
  const currentModels = getModelsForDeviceAndBrand(deviceType, brand);
  console.log(`Aktuelle iPhone-Modelle: ${currentModels.length}`);
  
  // Lösche alle vorhandenen Modelle für Smartphone -> Apple
  currentModels.forEach(model => {
    deleteModel(deviceType, brand, model);
  });
  
  // Speichere alle neuen Modelle
  iPhoneModels.forEach(model => {
    saveModel(deviceType, brand, model);
  });
  
  console.log(`${iPhoneModels.length} iPhone-Modelle wurden aktualisiert.`);
  
  return {
    oldCount: currentModels.length,
    newCount: iPhoneModels.length,
    models: iPhoneModels
  };
}
