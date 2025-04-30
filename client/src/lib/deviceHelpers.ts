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
  console.log("Saving model intelligent with:", { deviceType, brand, modelSeries, model, deviceTypeId, brandId });
  
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
              if (modelSeries) {
                createModelSeriesMutation.mutate({
                  name: modelSeries,
                  brandId: newBrand.id
                }, {
                  onSuccess: (newModelSeries: any) => {
                    // 4. Modell zur neuen Modellreihe hinzufügen
                    createModelMutation.mutate({
                      name: model,
                      modelSeriesId: newModelSeries.id
                    });
                  }
                });
              } else {
                // Wenn keine Modellreihe, direkt zur Marke hinzufügen
                createModelMutation.mutate({
                  name: model,
                  brandId: newBrand.id
                });
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
        if (modelSeries) {
          createModelSeriesMutation.mutate({
            name: modelSeries,
            brandId: newBrand.id
          }, {
            onSuccess: (newModelSeries: any) => {
              createModelMutation.mutate({
                name: model,
                modelSeriesId: newModelSeries.id
              });
            }
          });
        } else {
          createModelMutation.mutate({
            name: model,
            brandId: newBrand.id
          });
        }
      }
    });
  } else if (deviceTypeId && brandId) {
    // Wenn sowohl Gerätetyp als auch Marke existieren
    if (modelSeries) {
      // Prüfen, ob die Modellreihe bereits existiert
      createModelSeriesMutation.mutate({
        name: modelSeries,
        brandId: brandId
      }, {
        onSuccess: (newModelSeries: any) => {
          createModelMutation.mutate({
            name: model,
            modelSeriesId: newModelSeries.id
          });
        }
      });
    } else {
      // Wenn keine Modellreihe, direkt zur Marke hinzufügen
      createModelMutation.mutate({
        name: model,
        brandId: brandId
      });
    }
  }
}