import { useState } from 'react';
import DeviceSelector from '@/components/DeviceSelector';

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

export default function DeviceSelectorDemo() {
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Geräteauswahl Demonstration</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <DeviceSelector 
          onDeviceTypeSelect={setSelectedDeviceType}
          onBrandSelect={setSelectedBrand}
          onModelSelect={setSelectedModel}
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