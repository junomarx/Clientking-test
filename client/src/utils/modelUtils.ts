// Hilfsfunktion für Modellspeicherung - nur für Admins (bugi)
export const saveModelDb = (
  deviceType: string,
  brand: string,
  modelSeries: string | null,
  model: string,
  deviceTypeId: number | null,
  brandId: number | null,
  createDeviceTypeMut: any,
  createBrandMut: any,
  createModelSeriesMut: any,
  createModelsMut: any,
  user: any
) => {
  // Prüfen ob der Benutzer Admin-Rechte hat (nur bugi)
  if (!user || user.username !== 'bugi') {
    console.log("Keine Admin-Rechte zum Erstellen neuer Modelle");
    return false; // Nur Admin darf Modelle erstellen
  }
  
  // Implementierung der Modellspeicherung
  console.log("Speichere Modell:", model, "für", deviceType, brand, modelSeries);
  
  if (!deviceTypeId) {
    console.log("Gerätetyp existiert nicht in der Datenbank - wird erstellt");
  }
  
  if (!brandId) {
    console.log("Marke existiert nicht in der Datenbank - wird erstellt");
    if (deviceTypeId) {
      // Marke erstellen
      createBrandMut.mutate({ 
        name: brand,
        deviceTypeId: deviceTypeId
      });
    }
  }
  
  // Modell in der Datenbank speichern
  if (deviceTypeId && brandId && modelSeries) {
    // Modellreihe in der Datenbank suchen oder erstellen
    // Modellreihe erstellen
    createModelSeriesMut.mutate({
      name: modelSeries,
      brandId: brandId
    }, {
      onSuccess: (data: any) => {
        // Prüfen, ob das Modell bereits existiert
        // Wir rufen die API auf, um alle Modelle für diese ModelSeries zu laden
        fetch(`/api/models?modelSeriesId=${data.id}`)
          .then(response => response.json())
          .then(existingModels => {
            // Prüfen, ob das Modell bereits existiert
            const modelExists = existingModels.some((m: any) => 
              m.name.toLowerCase() === model.toLowerCase()
            );
            
            // Nur speichern, wenn das Modell noch nicht existiert
            if (!modelExists) {
              createModelsMut.mutate({
                modelSeriesId: data.id,
                names: [model]
              });
              console.log("Neues Modell wird erstellt:", model);
            } else {
              console.log("Modell existiert bereits, wird nicht erneut erstellt:", model);
            }
          });
      }
    });
  } else if (deviceTypeId && brandId) {
    // Ohne Modellreihe - Standard-Modellreihe erstellen oder finden
    createModelSeriesMut.mutate({
      name: "_default",
      brandId: brandId
    }, {
      onSuccess: (data: any) => {
        // Prüfen, ob das Modell bereits existiert
        fetch(`/api/models?modelSeriesId=${data.id}`)
          .then(response => response.json())
          .then(existingModels => {
            // Prüfen, ob das Modell bereits existiert
            const modelExists = existingModels.some((m: any) => 
              m.name.toLowerCase() === model.toLowerCase()
            );
            
            // Nur speichern, wenn das Modell noch nicht existiert
            if (!modelExists) {
              createModelsMut.mutate({
                modelSeriesId: data.id,
                names: [model]
              });
              console.log("Neues Modell wird erstellt:", model);
            } else {
              console.log("Modell existiert bereits, wird nicht erneut erstellt:", model);
            }
          });
      }
    });
  }
  
  return true; // Erfolgreich gespeichert
};