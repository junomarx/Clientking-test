import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  
  useEffect(() => {
    // Lade Gerätetypen beim Seitenaufruf
    fetch("/api/global/device-types")
      .then(res => res.json())
      .then(data => setDeviceTypes(data))
      .catch(err => console.error("Fehler beim Laden der Gerätetypen:", err));
  }, []);
  
  useEffect(() => {
    // Lade Marken wenn ein Gerätetyp ausgewählt wurde
    if (selectedDeviceType) {
      const deviceTypeId = parseInt(selectedDeviceType);
      fetch(`/api/global/brands?deviceTypeId=${deviceTypeId}`)
        .then(res => res.json())
        .then(data => {
          console.log(`${data.length} Marken für Gerätetyp ${deviceTypeId} geladen`);
          setBrands(data);
          setSelectedBrand("");
          setModels([]);
        })
        .catch(err => console.error("Fehler beim Laden der Marken:", err));
    } else {
      setBrands([]);
      setSelectedBrand("");
      setModels([]);
    }
  }, [selectedDeviceType]);
  
  useEffect(() => {
    // Lade Modelle wenn eine Marke ausgewählt wurde
    if (selectedBrand && selectedDeviceType) {
      const brandId = parseInt(selectedBrand);
      const deviceTypeId = parseInt(selectedDeviceType);
      fetch(`/api/global/models?brandId=${brandId}&deviceTypeId=${deviceTypeId}`)
        .then(res => res.json())
        .then(data => {
          console.log(`${data.length} Modelle für Marke ${brandId} und Gerätetyp ${deviceTypeId} geladen`);
          setModels(data);
        })
        .catch(err => console.error("Fehler beim Laden der Modelle:", err));
    } else {
      setModels([]);
    }
  }, [selectedBrand, selectedDeviceType]);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">API Test: Geräteauswahl</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Gerätetyp auswählen</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedDeviceType} 
              onValueChange={setSelectedDeviceType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Gerätetyp auswählen" />
              </SelectTrigger>
              <SelectContent>
                {deviceTypes.map(deviceType => (
                  <SelectItem key={deviceType.id} value={deviceType.id.toString()}>
                    {deviceType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 text-sm">
              {selectedDeviceType && (
                <span>Gerätetyp ID: {selectedDeviceType}</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Marke auswählen</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedBrand} 
              onValueChange={setSelectedBrand}
              disabled={!selectedDeviceType || brands.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={brands.length === 0 ? "Keine Marken verfügbar" : "Marke auswählen"} />
              </SelectTrigger>
              <SelectContent>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 text-sm">
              {brands.length > 0 && (
                <span>{brands.length} Marken verfügbar</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Modell auswählen</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              disabled={!selectedBrand || models.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={models.length === 0 ? "Keine Modelle verfügbar" : "Modell auswählen"} />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.id} value={model.id.toString()}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 text-sm">
              {models.length > 0 && (
                <span>{models.length} Modelle verfügbar</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>API Response: Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-2 rounded max-h-60 overflow-auto">
              {JSON.stringify(brands, null, 2)}
            </pre>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API Response: Models</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-2 rounded max-h-60 overflow-auto">
              {JSON.stringify(models, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}