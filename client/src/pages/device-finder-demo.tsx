import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import DeviceListView from '@/components/device-finder/DeviceListView';

// Import Typen
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

export default function DeviceFinderDemo() {
  // Ausgewählte Werte
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  // API-Abfragen für die Daten
  const { data: deviceTypes = [], isLoading: isLoadingDeviceTypes } = useQuery<DeviceType[]>({
    queryKey: ['/api/global/device-types'],
    queryFn: async () => (await apiRequest('GET', '/api/global/device-types')).json(),
  });

  const { data: brands = [], isLoading: isLoadingBrands } = useQuery<Brand[]>({
    queryKey: ['/api/global/brands'],
    queryFn: async () => (await apiRequest('GET', '/api/global/brands')).json(),
  });

  const { data: models = [], isLoading: isLoadingModels } = useQuery<Model[]>({
    queryKey: ['/api/global/models'],
    queryFn: async () => (await apiRequest('GET', '/api/global/models')).json(),
  });

  // Handler für die Auswahlen
  const handleDeviceTypeSelect = (deviceType: DeviceType) => {
    setSelectedDeviceType(deviceType);
    setSelectedBrand(null);
    setSelectedModel(null);
  };

  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrand(brand);
    setSelectedModel(null);
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
  };

  return (
    <div className="container mx-auto p-4 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Device Finder Demo</h1>
      
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <DeviceListView
          deviceTypes={deviceTypes}
          brands={brands}
          models={models}
          onDeviceTypeSelect={handleDeviceTypeSelect}
          onBrandSelect={handleBrandSelect}
          onModelSelect={handleModelSelect}
          selectedDeviceTypeId={selectedDeviceType?.id || null}
          selectedBrandId={selectedBrand?.id || null}
          selectedModelId={selectedModel?.id || null}
          isLoadingDeviceTypes={isLoadingDeviceTypes}
          isLoadingBrands={isLoadingBrands}
          isLoadingModels={isLoadingModels}
        />
      </div>

      <div className="mt-8 bg-gray-50 p-6 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">Ausgewählte Werte:</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Geräteart:</span>{' '}
            {selectedDeviceType ? selectedDeviceType.name : 'Nicht ausgewählt'}
          </p>
          <p>
            <span className="font-medium">Hersteller:</span>{' '}
            {selectedBrand ? selectedBrand.name : 'Nicht ausgewählt'}
          </p>
          <p>
            <span className="font-medium">Modell:</span>{' '}
            {selectedModel ? selectedModel.name : 'Nicht ausgewählt'}
          </p>
        </div>
      </div>
    </div>
  );
}