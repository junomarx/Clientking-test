// Hilfsfunktionen für die Geräteoperationen

// Standardwerte für die unterstützten Gerätetypen und Marken
export const defaultBrands: { [key: string]: string[] } = {
  smartphone: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google', 'Sony', 'LG', 'Motorola', 'Nokia'],
  tablet: ['Apple', 'Samsung', 'Huawei', 'Lenovo', 'Microsoft', 'Amazon', 'Asus', 'Acer', 'LG'],
  laptop: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Microsoft', 'Samsung', 'MSI', 'Razer', 'Toshiba'],
  smartwatch: ['Apple', 'Samsung', 'Fitbit', 'Garmin', 'Huawei', 'Fossil', 'TicWatch', 'Amazfit', 'Withings'],
  kopfhörer: ['Apple', 'Bose', 'Sony', 'Sennheiser', 'JBL', 'Beats', 'Samsung', 'Skullcandy', 'Jabra', 'Audio-Technica'],
  konsole: ['Sony', 'Microsoft', 'Nintendo', 'Sega', 'Atari'],
};

// Funktionen zum Ersetzen von localStorage-Aufrufen während der Migration
export const getBrandsForDeviceType = (deviceType: string) => {
  // Diese Funktion dient als Fallback für die API-basierte Implementierung
  const deviceTypeLower = deviceType.toLowerCase();
  return defaultBrands[deviceTypeLower] || [];
};

export const clearAllModels = () => {
  console.log('clearAllModels wurde aufgerufen - in Zukunft sollte dies durch API-Aufrufe ersetzt werden');
};

export const deleteModelLegacy = (deviceType: string, brand: string, model: string) => {
  console.log(`deleteModelLegacy wurde aufgerufen für ${deviceType}, ${brand}, ${model} - in Zukunft sollte dies durch API-Aufrufe ersetzt werden`);
};

// Hilfsfunktion zum intelligenten Speichern von Modellen
/**
 * Speichert ein Modell in der Datenbank mit intelligenter Hierarchie-Verwaltung
 * 
 * Diese Funktion prüft, ob der Gerätetyp, die Marke und ggf. die Modellserie bereits existieren.
 * Falls nicht, werden diese erstellt, bevor das Modell gespeichert wird.
 */
export function saveModelIntelligent(
  deviceType: string, 
  brand: string, 
  modelSeries: string | undefined | null,
  model: string,
  deviceTypeId: number | null,
  brandId: number | null,
  createDeviceTypeMutation: any,
  createBrandMutation: any,
  createModelSeriesMutation: any,
  createModelMutation: any
): void {
  // Diese Funktion verwendet die API-Mutations, um Modellhierarchien zu speichern
  console.log("Speichere Modell mit:", { deviceType, brand, modelSeries, model, deviceTypeId, brandId });
  
  // Modellreihen-Erstellung nur vornehmen, wenn auch tatsächlich ein Modell angegeben wurde
  if (!model || model.trim() === '') {
    console.log("Kein Modell angegeben, überspringe Hierarchie-Erstellung");
    return;
  }
  
  // Hilffunktion zum Erstellen eines Modells für eine bestimmte Modellreihe
  const createModelForSeries = (seriesId: number) => {
    console.log(`Erstelle Modell '${model}' für Modellreihe ID ${seriesId}`);
    createModelMutation.mutate({
      modelSeriesId: seriesId,
      names: [model]
    });
  };
  
  // Hilfsfunktion zum Erstellen eines Modells direkt für eine Marke
  const createModelForBrand = (brandId: number) => {
    console.log(`Erstelle Modell '${model}' direkt für Marke ID ${brandId}`);
    createModelMutation.mutate({
      brandId: brandId,
      names: [model]
    });
  };
  
  // 1. Überprüfen, ob der Gerätetyp existiert, sonst erstellen
  if (!deviceTypeId && deviceType) {
    createDeviceTypeMutation.mutate({ name: deviceType }, {
      onSuccess: (newDeviceType: any) => {
        // 2. Überprüfen, ob die Marke existiert, sonst erstellen
        if (brand) {
          createBrandMutation.mutate({
            name: brand,
            deviceTypeId: newDeviceType.id
          }, {
            onSuccess: (newBrand: any) => {
              // 3. Überprüfen, ob eine Modellreihe angegeben wurde
              if (modelSeries && modelSeries.trim() !== '') {
                // Nur einmal die Modellreihe erstellen und dann das Modell hinzufügen
                createModelSeriesMutation.mutate({
                  name: modelSeries,
                  brandId: newBrand.id
                }, {
                  onSuccess: createModelForSeries
                });
              } else {
                // Wenn keine Modellreihe, direkt zur Marke hinzufügen
                createModelForBrand(newBrand.id);
              }
            }
          });
        }
      }
    });
  } else if (deviceTypeId && !brandId && brand) {
    // Wenn der Gerätetyp existiert, aber die Marke nicht
    createBrandMutation.mutate({
      name: brand,
      deviceTypeId: deviceTypeId
    }, {
      onSuccess: (newBrand: any) => {
        if (modelSeries && modelSeries.trim() !== '') {
          // Nur einmal die Modellreihe erstellen und dann das Modell hinzufügen
          createModelSeriesMutation.mutate({
            name: modelSeries,
            brandId: newBrand.id
          }, {
            onSuccess: createModelForSeries
          });
        } else {
          // Wenn keine Modellreihe, direkt zur Marke hinzufügen
          createModelForBrand(newBrand.id);
        }
      }
    });
  } else if (deviceTypeId && brandId) {
    // Wenn sowohl Gerätetyp als auch Marke existieren
    if (modelSeries && modelSeries.trim() !== '') {
      // Prüfen, ob die Modellreihe bereits existiert
      createModelSeriesMutation.mutate({
        name: modelSeries,
        brandId: brandId
      }, {
        onSuccess: createModelForSeries
      });
    } else {
      // Wenn keine Modellreihe, direkt zur Marke hinzufügen
      createModelForBrand(brandId);
    }
  }
}