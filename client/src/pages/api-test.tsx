import { useEffect, useState } from "react";

interface DeviceType {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
}

interface Model {
  id: number;
  name: string;
  brandId: number;
  deviceTypeId: number;
}

export default function ApiTest() {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState<number | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Lade alle Gerätetypen beim Seitenaufruf
    setLoading(true);
    fetch("/api/global/device-types")
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setDeviceTypes(data);
        setLoading(false);
        console.log("Gerätetypen geladen:", data.length);
      })
      .catch(err => {
        console.error("Fehler beim Laden der Gerätetypen:", err);
        setError(`Fehler beim Laden der Gerätetypen: ${err.message}`);
        setLoading(false);
      });
  }, []);
  
  // Lade Marken wenn ein Gerätetyp ausgewählt wurde
  const loadBrands = (deviceTypeId: number) => {
    setLoading(true);
    fetch(`/api/global/brands?deviceTypeId=${deviceTypeId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setBrands(data);
        setLoading(false);
        console.log(`${data.length} Marken für Gerätetyp ${deviceTypeId} geladen`);
      })
      .catch(err => {
        console.error(`Fehler beim Laden der Marken für Gerätetyp ${deviceTypeId}:`, err);
        setError(`Fehler beim Laden der Marken: ${err.message}`);
        setLoading(false);
      });
  };
  
  // Lade Modelle wenn eine Marke ausgewählt wurde
  const loadModels = (brandId: number, deviceTypeId: number) => {
    setLoading(true);
    fetch(`/api/global/models?brandId=${brandId}&deviceTypeId=${deviceTypeId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setModels(data);
        setLoading(false);
        console.log(`${data.length} Modelle für Marke ${brandId} und Gerätetyp ${deviceTypeId} geladen`);
      })
      .catch(err => {
        console.error(`Fehler beim Laden der Modelle für Marke ${brandId}:`, err);
        setError(`Fehler beim Laden der Modelle: ${err.message}`);
        setLoading(false);
      });
  };
  
  // Funktion zum Testen aller API-Endpunkte auf einmal
  const testAllApis = () => {
    setError(null);
    
    // Test: Alle Gerätetypen abrufen
    fetch("/api/global/device-types")
      .then(res => res.json())
      .then(data => {
        console.log("TEST Gerätetypen:", data.length);
        document.getElementById("deviceTypesResult")!.textContent = 
          `Erfolgreich: ${data.length} Gerätetypen geladen`;
        
        if (data.length > 0) {
          const typeId = data[0].id;
          
          // Test: Marken für den ersten Gerätetyp abrufen
          fetch(`/api/global/brands?deviceTypeId=${typeId}`)
            .then(res => res.json())
            .then(brandData => {
              console.log(`TEST Marken für Typ ${typeId}:`, brandData.length);
              document.getElementById("brandsResult")!.textContent = 
                `Erfolgreich: ${brandData.length} Marken für Typ ${typeId} geladen`;
              
              if (brandData.length > 0) {
                const brandId = brandData[0].id;
                
                // Test: Modelle für die erste Marke abrufen
                fetch(`/api/global/models?brandId=${brandId}&deviceTypeId=${typeId}`)
                  .then(res => res.json())
                  .then(modelData => {
                    console.log(`TEST Modelle für Marke ${brandId}:`, modelData.length);
                    document.getElementById("modelsResult")!.textContent = 
                      `Erfolgreich: ${modelData.length} Modelle für Marke ${brandId} und Typ ${typeId} geladen`;
                  })
                  .catch(err => {
                    document.getElementById("modelsResult")!.textContent = 
                      `Fehler: ${err.message}`;
                  });
              } else {
                document.getElementById("modelsResult")!.textContent = 
                  "Keine Marken gefunden, kann Modelle nicht testen";
              }
            })
            .catch(err => {
              document.getElementById("brandsResult")!.textContent = 
                `Fehler: ${err.message}`;
            });
        } else {
          document.getElementById("brandsResult")!.textContent = 
            "Keine Gerätetypen gefunden, kann Marken nicht testen";
          document.getElementById("modelsResult")!.textContent = 
            "Keine Gerätetypen gefunden, kann Modelle nicht testen";
        }
      })
      .catch(err => {
        document.getElementById("deviceTypesResult")!.textContent = 
          `Fehler: ${err.message}`;
      });
  };
  
  return (
    <div style={{ 
      padding: "20px", 
      maxWidth: "900px",
      margin: "0 auto",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>API Test: Globale Gerätedaten</h1>
      
      {error && (
        <div style={{ 
          padding: "10px", 
          backgroundColor: "#ffebee", 
          color: "#c62828",
          borderRadius: "4px",
          marginBottom: "20px" 
        }}>
          <strong>Fehler:</strong> {error}
        </div>
      )}
      
      <div style={{ marginBottom: "30px" }}>
        <button 
          onClick={testAllApis}
          style={{
            padding: "10px 15px",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Alle API-Endpunkte testen
        </button>
      </div>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr", 
        gap: "15px",
        marginBottom: "20px" 
      }}>
        <div style={{ 
          padding: "15px", 
          border: "1px solid #e0e0e0", 
          borderRadius: "4px" 
        }}>
          <h3 style={{ marginTop: 0 }}>Gerätetypen</h3>
          <p id="deviceTypesResult">Noch nicht getestet</p>
          <div style={{ 
            marginTop: "15px", 
            maxHeight: "200px", 
            overflow: "auto" 
          }}>
            <ul>
              {deviceTypes.map(type => (
                <li key={type.id} style={{ marginBottom: "5px" }}>
                  <button 
                    onClick={() => {
                      setSelectedDeviceType(type.id);
                      loadBrands(type.id);
                    }}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: selectedDeviceType === type.id ? "#2196f3" : "#e0e0e0",
                      color: selectedDeviceType === type.id ? "white" : "black",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%"
                    }}
                  >
                    {type.name} (ID: {type.id})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div style={{ 
          padding: "15px", 
          border: "1px solid #e0e0e0", 
          borderRadius: "4px" 
        }}>
          <h3 style={{ marginTop: 0 }}>Marken</h3>
          <p id="brandsResult">Noch nicht getestet</p>
          <div style={{ 
            marginTop: "15px", 
            maxHeight: "200px", 
            overflow: "auto" 
          }}>
            <ul>
              {brands.map(brand => (
                <li key={brand.id} style={{ marginBottom: "5px" }}>
                  <button 
                    onClick={() => {
                      if (selectedDeviceType) {
                        setSelectedBrand(brand.id);
                        loadModels(brand.id, selectedDeviceType);
                      }
                    }}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: selectedBrand === brand.id ? "#2196f3" : "#e0e0e0",
                      color: selectedBrand === brand.id ? "white" : "black",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%"
                    }}
                  >
                    {brand.name} (ID: {brand.id})
                  </button>
                </li>
              ))}
            </ul>
            {brands.length === 0 && selectedDeviceType && (
              <p style={{ color: "#9e9e9e", fontStyle: "italic" }}>
                Keine Marken für diesen Gerätetyp verfügbar
              </p>
            )}
          </div>
        </div>
        
        <div style={{ 
          padding: "15px", 
          border: "1px solid #e0e0e0", 
          borderRadius: "4px" 
        }}>
          <h3 style={{ marginTop: 0 }}>Modelle</h3>
          <p id="modelsResult">Noch nicht getestet</p>
          <div style={{ 
            marginTop: "15px", 
            maxHeight: "200px", 
            overflow: "auto" 
          }}>
            <ul>
              {models.map(model => (
                <li key={model.id} style={{ marginBottom: "5px" }}>
                  <div style={{
                    padding: "5px 10px",
                    backgroundColor: "#e0e0e0",
                    borderRadius: "4px",
                  }}>
                    {model.name} (ID: {model.id})
                  </div>
                </li>
              ))}
            </ul>
            {models.length === 0 && selectedBrand && (
              <p style={{ color: "#9e9e9e", fontStyle: "italic" }}>
                Keine Modelle für diese Marke verfügbar
              </p>
            )}
          </div>
        </div>
      </div>
      
      {loading && (
        <div style={{
          padding: "10px",
          backgroundColor: "#e3f2fd",
          color: "#1565c0",
          borderRadius: "4px",
          marginTop: "20px"
        }}>
          Daten werden geladen...
        </div>
      )}
    </div>
  );
}