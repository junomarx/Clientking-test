import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Smartphone, Tablet, Laptop, Watch, GamepadIcon, Search } from 'lucide-react';
import MobileDeviceList from '../MobileDeviceList';

// Typen für die Gerätesuche
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
}

// Eigenschaften der Komponente
interface DeviceListViewProps {
  deviceTypes: DeviceType[];
  brands: Brand[];
  models: Model[];
  onDeviceTypeSelect: (deviceType: DeviceType) => void;
  onBrandSelect: (brand: Brand) => void;
  onModelSelect: (model: Model) => void;
  selectedDeviceTypeId?: number | null;
  selectedBrandId?: number | null;
  selectedModelId?: number | null;
  isLoadingDeviceTypes?: boolean;
  isLoadingBrands?: boolean;
  isLoadingModels?: boolean;
}

// Icons für Gerätetypen
const getDeviceTypeIcon = (typeName: string) => {
  const iconClassName = "h-5 w-5";
  
  switch (typeName.toLowerCase()) {
    case 'smartphone':
      return <Smartphone className={iconClassName} />;
    case 'tablet':
      return <Tablet className={iconClassName} />;
    case 'laptop':
      return <Laptop className={iconClassName} />;
    case 'watch':
    case 'smartwatch':
      return <Watch className={iconClassName} />;
    case 'spielekonsole':
    case 'gameconsole':
      return <GamepadIcon className={iconClassName} />;
    default:
      return <Smartphone className={iconClassName} />;
  }
};

export default function DeviceListView({
  deviceTypes,
  brands,
  models,
  onDeviceTypeSelect,
  onBrandSelect,
  onModelSelect,
  selectedDeviceTypeId,
  selectedBrandId,
  selectedModelId,
  isLoadingDeviceTypes = false,
  isLoadingBrands = false,
  isLoadingModels = false,
}: DeviceListViewProps) {
  // Aktiver Tab
  const [activeTab, setActiveTab] = useState<string>("deviceTypes");
  
  // Suchzustände
  const [deviceTypeSearchTerm, setDeviceTypeSearchTerm] = useState('');
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [modelSearchTerm, setModelSearchTerm] = useState('');

  // Gefilterte Gerätetypen
  const filteredDeviceTypes = useMemo(() => {
    return deviceTypes.filter(type => 
      type.name.toLowerCase().includes(deviceTypeSearchTerm.toLowerCase())
    );
  }, [deviceTypes, deviceTypeSearchTerm]);

  // Gefilterte Marken basierend auf ausgewähltem Gerätetyp
  const filteredBrands = useMemo(() => {
    let filteredList = brands;
    
    // Filter nach Gerätetyp
    if (selectedDeviceTypeId) {
      filteredList = filteredList.filter(brand => brand.deviceTypeId === selectedDeviceTypeId);
    }
    
    // Suche
    if (brandSearchTerm) {
      filteredList = filteredList.filter(brand => 
        brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase())
      );
    }
    
    return filteredList;
  }, [brands, selectedDeviceTypeId, brandSearchTerm]);

  // Gefilterte Modelle basierend auf ausgewählter Marke
  const filteredModels = useMemo(() => {
    let filteredList = models;
    
    // Filter nach Marke
    if (selectedBrandId) {
      filteredList = filteredList.filter(model => model.brandId === selectedBrandId);
    }
    
    // Suche
    if (modelSearchTerm) {
      filteredList = filteredList.filter(model => 
        model.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
      );
    }
    
    return filteredList;
  }, [models, selectedBrandId, modelSearchTerm]);

  // Hilfsfunktion, um den Gerätetyp-Namen für eine Marke zu erhalten
  const getDeviceTypeNameForBrand = (brand: Brand) => {
    const deviceType = deviceTypes.find(type => type.id === brand.deviceTypeId);
    return deviceType?.name || 'Unbekannt';
  };

  // Hilfsfunktion, um den Gerätetyp-Namen für ein Modell zu erhalten
  const getDeviceTypeNameForModel = (model: Model) => {
    const brand = brands.find(b => b.id === model.brandId);
    if (!brand) return 'Unbekannt';
    
    return getDeviceTypeNameForBrand(brand);
  };

  // Wenn wir loading-Zustände haben, zeigen wir Ladeanimationen an
  if (isLoadingDeviceTypes) {
    return (
      <div className="flex justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="deviceTypes" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deviceTypes">Gerätetypen</TabsTrigger>
          <TabsTrigger 
            value="brands" 
            disabled={!selectedDeviceTypeId}
            className={!selectedDeviceTypeId ? 'opacity-50' : ''}
          >
            Hersteller
          </TabsTrigger>
          <TabsTrigger 
            value="models" 
            disabled={!selectedBrandId}
            className={!selectedBrandId ? 'opacity-50' : ''}
          >
            Modelle
          </TabsTrigger>
        </TabsList>

        {/* Gerätetypen Tab */}
        <TabsContent value="deviceTypes">
          <div className="mb-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Gerätetyp suchen..." 
              value={deviceTypeSearchTerm}
              onChange={(e) => setDeviceTypeSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <MobileDeviceList
            items={filteredDeviceTypes}
            type="deviceType"
            onSelect={(item) => {
              onDeviceTypeSelect(item as DeviceType);
              setActiveTab("brands");
            }}
            selectedId={selectedDeviceTypeId || undefined}
          />
        </TabsContent>

        {/* Marken Tab */}
        <TabsContent value="brands">
          <div className="mb-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Hersteller suchen..." 
              value={brandSearchTerm}
              onChange={(e) => setBrandSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {isLoadingBrands ? (
            <div className="flex justify-center p-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <MobileDeviceList
              items={filteredBrands}
              type="brand"
              onSelect={(item) => {
                onBrandSelect(item as Brand);
                setActiveTab("models");
              }}
              selectedId={selectedBrandId || undefined}
              getDeviceTypeName={getDeviceTypeNameForBrand}
            />
          )}
        </TabsContent>

        {/* Modelle Tab */}
        <TabsContent value="models">
          <div className="mb-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Modell suchen..." 
              value={modelSearchTerm}
              onChange={(e) => setModelSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {isLoadingModels ? (
            <div className="flex justify-center p-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <MobileDeviceList
              items={filteredModels}
              type="model"
              onSelect={(item) => {
                onModelSelect(item as Model);
              }}
              selectedId={selectedModelId || undefined}
              getDeviceTypeName={getDeviceTypeNameForModel}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Ausgewählte Werte anzeigen */}
      {(selectedDeviceTypeId || selectedBrandId || selectedModelId) && (
        <div className="mt-6 bg-muted p-4 rounded-lg">
          <h3 className="text-sm font-medium mb-2">Aktuelle Auswahl:</h3>
          <div className="space-y-1 text-sm">
            {selectedDeviceTypeId && (
              <div className="flex items-center">
                <span className="text-muted-foreground mr-2">Gerätetyp:</span>
                <span className="font-medium">
                  {deviceTypes.find(t => t.id === selectedDeviceTypeId)?.name || 'Unbekannt'}
                </span>
              </div>
            )}
            {selectedBrandId && (
              <div className="flex items-center">
                <span className="text-muted-foreground mr-2">Hersteller:</span>
                <span className="font-medium">
                  {brands.find(b => b.id === selectedBrandId)?.name || 'Unbekannt'}
                </span>
              </div>
            )}
            {selectedModelId && (
              <div className="flex items-center">
                <span className="text-muted-foreground mr-2">Modell:</span>
                <span className="font-medium">
                  {models.find(m => m.id === selectedModelId)?.name || 'Unbekannt'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}