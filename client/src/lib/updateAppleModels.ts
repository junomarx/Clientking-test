import { 
  getModelsForDeviceAndBrand, 
  saveModel, 
  deleteModelLegacy, 
  saveModelSeries, 
  deleteModel,
  getModelSeriesForDeviceAndBrand
} from './localStorage';

/**
 * Aktualisiert die iPhone-Modelle in der Smartphone -> Apple Auswahl
 * Organisiert die Modelle nach Modellreihen und speichert sie im neuen Format
 */
export function updateAppleModels() {
  const deviceType = 'Smartphone';
  const brand = 'Apple';
  
  // Definiere die Gruppierung nach Modellreihen
  const modelData = {
    'iPhone 5-Serie': [
      'iPhone 5',
      'iPhone 5c',
      'iPhone 5s'
    ],
    'iPhone 6-Serie': [
      'iPhone 6',
      'iPhone 6 Plus',
      'iPhone 6s',
      'iPhone 6s Plus'
    ],
    'iPhone SE': [
      'iPhone SE (1. Generation)',
      'iPhone SE (2. Generation)',
      'iPhone SE (3. Generation)'
    ],
    'iPhone 7-Serie': [
      'iPhone 7',
      'iPhone 7 Plus'
    ],
    'iPhone 8-Serie': [
      'iPhone 8',
      'iPhone 8 Plus'
    ],
    'iPhone X-Serie': [
      'iPhone X',
      'iPhone XR',
      'iPhone XS',
      'iPhone XS Max'
    ],
    'iPhone 11-Serie': [
      'iPhone 11',
      'iPhone 11 Pro',
      'iPhone 11 Pro Max'
    ],
    'iPhone 12-Serie': [
      'iPhone 12 mini',
      'iPhone 12',
      'iPhone 12 Pro',
      'iPhone 12 Pro Max'
    ],
    'iPhone 13-Serie': [
      'iPhone 13 mini',
      'iPhone 13',
      'iPhone 13 Pro',
      'iPhone 13 Pro Max'
    ],
    'iPhone 14-Serie': [
      'iPhone 14',
      'iPhone 14 Plus',
      'iPhone 14 Pro',
      'iPhone 14 Pro Max'
    ],
    'iPhone 15-Serie': [
      'iPhone 15',
      'iPhone 15 Plus',
      'iPhone 15 Pro',
      'iPhone 15 Pro Max'
    ],
    'iPhone 16-Serie': [
      'iPhone 16',
      'iPhone 16 Plus',
      'iPhone 16 Pro',
      'iPhone 16 Pro Max',
      'iPhone 16e'
    ]
  };
  
  // Zähle alle Modelle, um die Gesamtzahl zu ermitteln
  const allModels = Object.values(modelData).flat();
  
  // Hole aktuelle Modelle, um zu prüfen, ob wir sie ersetzen müssen
  const currentModels = getModelsForDeviceAndBrand(deviceType, brand);
  console.log(`Aktuelle iPhone-Modelle: ${currentModels.length}`);
  
  // Lösche alle vorhandenen Modelle für Smartphone -> Apple (Legacy)
  currentModels.forEach(model => {
    deleteModelLegacy(deviceType, brand, model);
  });
  
  // Lösche alle vorhandenen Modelle für alle Modellreihen
  const existingSeries = getModelSeriesForDeviceAndBrand(deviceType, brand);
  existingSeries.forEach(series => {
    // Hole die Modelle dieser Serie und lösche sie
    const seriesModels = getModelsForDeviceAndBrand(deviceType, brand);
    seriesModels.forEach(model => {
      deleteModel(deviceType, brand, series, model);
    });
  });
  
  // Speichere die neuen Modelle nach Modellreihen gruppiert
  Object.entries(modelData).forEach(([series, models]) => {
    // Erstelle die Modellreihe, falls sie noch nicht existiert
    saveModelSeries(deviceType, brand, series);
    
    // Speichere alle Modelle in dieser Modellreihe
    models.forEach(model => {
      saveModel(deviceType, brand, series, model);
    });
  });
  
  console.log(`${allModels.length} iPhone-Modelle wurden in ${Object.keys(modelData).length} Modellreihen organisiert.`);
  
  return {
    oldCount: currentModels.length,
    newCount: allModels.length,
    models: allModels,
    series: Object.keys(modelData)
  };
}
