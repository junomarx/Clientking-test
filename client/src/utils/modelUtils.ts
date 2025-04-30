// Hilfsfunktion für Modellspeicherung
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
  createModelsMut: any
) => {
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
        createModelsMut.mutate({
          modelSeriesId: data.id,
          names: [model]
        });
      }
    });
  } else if (deviceTypeId && brandId) {
    // Ohne Modellreihe - Standard-Modellreihe erstellen oder finden
    createModelSeriesMut.mutate({
      name: "Standard",
      brandId: brandId
    }, {
      onSuccess: (data: any) => {
        createModelsMut.mutate({
          modelSeriesId: data.id,
          names: [model]
        });
      }
    });
  }
};