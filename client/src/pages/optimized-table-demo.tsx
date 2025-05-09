import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import OptimizedDevicesTable from '@/components/superadmin/OptimizedDevicesTable';
import { toast } from '@/hooks/use-toast';

// Interfaces für die Datentypen
interface DeviceType {
  id: number;
  name: string;
  userId: number;
  shopId: number;
}

interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
  deviceTypeName?: string;
  userId: number;
  shopId: number;
}

interface Model {
  id: number;
  name: string;
  brandId: number;
  deviceTypeName?: string;
  brandName?: string;
  userId: number;
  shopId: number;
}

export default function OptimizedTableDemo() {
  // Direkt toast API nutzen
  
  // Status für Filterung und Auswahl
  const [deviceTypeSearchTerm, setDeviceTypeSearchTerm] = useState('');
  const [selectedDeviceTypeIds, setSelectedDeviceTypeIds] = useState<number[]>([]);
  
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [selectedBrandDeviceType, setSelectedBrandDeviceType] = useState<string | null>(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const [selectedModelDeviceType, setSelectedModelDeviceType] = useState<string | null>(null);
  const [selectedModelBrandId, setSelectedModelBrandId] = useState<number | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);

  // Daten abrufen
  const { data: deviceTypes = [] } = useQuery<DeviceType[]>({
    queryKey: ['/api/global/device-types'],
    queryFn: async () => (await apiRequest('GET', '/api/global/device-types')).json(),
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['/api/global/brands'],
    queryFn: async () => {
      const result = await apiRequest('GET', '/api/global/brands');
      const data = await result.json();
      
      // Gerätetyp-Namen hinzufügen
      return data.map((brand: any) => {
        const deviceType = deviceTypes.find(type => type.id === brand.deviceTypeId);
        return {
          ...brand,
          deviceTypeName: deviceType?.name || 'Smartphone'
        };
      });
    },
    enabled: deviceTypes.length > 0,
  });

  const { data: models = [] } = useQuery<Model[]>({
    queryKey: ['/api/global/models'],
    queryFn: async () => {
      const result = await apiRequest('GET', '/api/global/models');
      const data = await result.json();
      
      // Gerätetyp-Namen und Markennamen hinzufügen
      return data.map((model: any) => {
        const brand = brands.find(b => b.id === model.brandId);
        return {
          ...model,
          brandName: brand?.name || 'Unbekannt',
          deviceTypeName: brand?.deviceTypeName || 'Smartphone'
        };
      });
    },
    enabled: brands.length > 0,
  });

  // Filterfunktionen
  const filteredDeviceTypes = deviceTypes.filter(type => 
    type.name.toLowerCase().includes(deviceTypeSearchTerm.toLowerCase())
  );

  const filteredBrands = brands.filter(brand => {
    const nameMatches = brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase());
    const typeMatches = !selectedBrandDeviceType || brand.deviceTypeName === selectedBrandDeviceType;
    return nameMatches && typeMatches;
  });

  const filteredModels = models.filter(model => {
    const nameMatches = model.name.toLowerCase().includes(modelSearchTerm.toLowerCase());
    const typeMatches = !selectedModelDeviceType || model.deviceTypeName === selectedModelDeviceType;
    const brandMatches = !selectedModelBrandId || model.brandId === selectedModelBrandId;
    return nameMatches && typeMatches && brandMatches;
  });

  // Handler-Funktionen
  const handleSelectDeviceType = (id: number) => {
    setSelectedDeviceTypeIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(typeId => typeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAllDeviceTypes = (selected: boolean) => {
    if (selected) {
      setSelectedDeviceTypeIds(filteredDeviceTypes.map(type => type.id));
    } else {
      setSelectedDeviceTypeIds([]);
    }
  };

  const handleDeleteDeviceType = (id: number) => {
    toast({
      title: "Demo-Modus",
      description: `Gerätetyp mit ID ${id} würde gelöscht werden.`,
    });
  };

  const handleBulkDeleteDeviceTypes = () => {
    toast({
      title: "Demo-Modus",
      description: `${selectedDeviceTypeIds.length} Gerätetypen würden gelöscht werden.`,
    });
    setSelectedDeviceTypeIds([]);
  };

  const handleSelectBrand = (id: number) => {
    setSelectedBrandIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(brandId => brandId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAllBrands = (selected: boolean) => {
    if (selected) {
      setSelectedBrandIds(filteredBrands.map(brand => brand.id));
    } else {
      setSelectedBrandIds([]);
    }
  };

  const handleDeleteBrand = (id: number) => {
    toast({
      title: "Demo-Modus",
      description: `Hersteller mit ID ${id} würde gelöscht werden.`,
    });
  };

  const handleBulkDeleteBrands = () => {
    toast({
      title: "Demo-Modus",
      description: `${selectedBrandIds.length} Hersteller würden gelöscht werden.`,
    });
    setSelectedBrandIds([]);
  };

  const handleSelectModel = (id: number) => {
    setSelectedModelIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(modelId => modelId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAllModels = (selected: boolean) => {
    if (selected) {
      setSelectedModelIds(filteredModels.map(model => model.id));
    } else {
      setSelectedModelIds([]);
    }
  };

  const handleDeleteModel = (id: number) => {
    toast({
      title: "Demo-Modus",
      description: `Modell mit ID ${id} würde gelöscht werden.`,
    });
  };

  const handleBulkDeleteModels = () => {
    toast({
      title: "Demo-Modus",
      description: `${selectedModelIds.length} Modelle würden gelöscht werden.`,
    });
    setSelectedModelIds([]);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Optimierte Tabellenansicht (Demo)</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Gerätetypen</h2>
          <OptimizedDevicesTable
            data={filteredDeviceTypes}
            type="deviceType"
            selectedIds={selectedDeviceTypeIds}
            onSelect={handleSelectDeviceType}
            onSelectAll={handleSelectAllDeviceTypes}
            onDelete={handleDeleteDeviceType}
            onBulkDelete={handleBulkDeleteDeviceTypes}
            searchTerm={deviceTypeSearchTerm}
            onSearchChange={setDeviceTypeSearchTerm}
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Hersteller</h2>
          <OptimizedDevicesTable
            data={filteredBrands}
            type="brand"
            selectedIds={selectedBrandIds}
            onSelect={handleSelectBrand}
            onSelectAll={handleSelectAllBrands}
            onDelete={handleDeleteBrand}
            onBulkDelete={handleBulkDeleteBrands}
            deviceTypes={deviceTypes}
            searchTerm={brandSearchTerm}
            onSearchChange={setBrandSearchTerm}
            selectedDeviceType={selectedBrandDeviceType}
            onDeviceTypeChange={setSelectedBrandDeviceType}
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Modelle</h2>
          <OptimizedDevicesTable
            data={filteredModels}
            type="model"
            selectedIds={selectedModelIds}
            onSelect={handleSelectModel}
            onSelectAll={handleSelectAllModels}
            onDelete={handleDeleteModel}
            onBulkDelete={handleBulkDeleteModels}
            deviceTypes={deviceTypes}
            brands={brands}
            searchTerm={modelSearchTerm}
            onSearchChange={setModelSearchTerm}
            selectedDeviceType={selectedModelDeviceType}
            onDeviceTypeChange={setSelectedModelDeviceType}
            selectedBrand={selectedModelBrandId}
            onBrandChange={setSelectedModelBrandId}
          />
        </div>
      </div>
    </div>
  );
}