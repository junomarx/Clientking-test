import { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { CheckIcon, ChevronsUpDown } from 'lucide-react';

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

interface DeviceSelectorProps {
  onDeviceTypeSelect?: (deviceType: DeviceType | null) => void;
  onBrandSelect?: (brand: Brand | null) => void;
  onModelSelect?: (model: Model | null) => void;
  className?: string;
}

export default function DeviceSelector({
  onDeviceTypeSelect,
  onBrandSelect,
  onModelSelect,
  className = ''
}: DeviceSelectorProps) {
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const [queryDeviceType, setQueryDeviceType] = useState('');
  const [queryBrand, setQueryBrand] = useState('');
  const [queryModel, setQueryModel] = useState('');

  // Daten von den globalen Endpunkten abrufen (ohne Authentifizierung)
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

  // Filterfunktion für die Dropdown-Suche
  const filter = (items: any[], query: string) =>
    items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

  // Handlers für Auswahländerungen
  const handleDeviceTypeChange = (deviceType: DeviceType | null) => {
    setSelectedDeviceType(deviceType);
    setSelectedBrand(null); // Zurücksetzen der Markenauswahl
    setSelectedModel(null); // Zurücksetzen der Modellauswahl
    if (onDeviceTypeSelect) onDeviceTypeSelect(deviceType);
  };

  const handleBrandChange = (brand: Brand | null) => {
    setSelectedBrand(brand);
    setSelectedModel(null); // Zurücksetzen der Modellauswahl
    if (onBrandSelect) onBrandSelect(brand);
  };

  const handleModelChange = (model: Model | null) => {
    setSelectedModel(model);
    if (onModelSelect) onModelSelect(model);
  };

  // Filtere die relevanten Marken und Modelle abhängig von der vorherigen Auswahl
  const filteredBrands = selectedDeviceType
    ? brands.filter(b => b.deviceTypeId === selectedDeviceType.id)
    : [];

  const filteredModels = selectedDeviceType
    ? models.filter(m => {
        const brand = brands.find(b => b.id === m.brandId);
        return (
          brand?.deviceTypeId === selectedDeviceType.id &&
          (!selectedBrand || m.brandId === selectedBrand.id)
        );
      })
    : [];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Geräteart */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Geräteart</label>
          <Combobox value={selectedDeviceType} onChange={handleDeviceTypeChange} nullable>
            <div className="relative">
              <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <Combobox.Input
                  className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                  onChange={(e) => setQueryDeviceType(e.target.value)}
                  displayValue={(item: DeviceType) => item?.name || ''}
                  placeholder="z. B. Smartphone"
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </Combobox.Button>
              </div>
              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {isLoadingDeviceTypes ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Lädt Gerätetypen...
                  </div>
                ) : filter(deviceTypes, queryDeviceType).length === 0 ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Nichts gefunden.
                  </div>
                ) : (
                  filter(deviceTypes, queryDeviceType).map((type) => (
                    <Combobox.Option
                      key={type.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-blue-600 text-white' : 'text-gray-900'
                        }`
                      }
                      value={type}
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {type.name}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? 'text-white' : 'text-blue-600'
                              }`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </div>
          </Combobox>
        </div>

        {/* Hersteller */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${selectedDeviceType ? 'text-gray-700' : 'text-gray-400'}`}>
            Hersteller
          </label>
          <Combobox
            value={selectedBrand}
            onChange={handleBrandChange}
            disabled={!selectedDeviceType}
            nullable
          >
            <div className="relative">
              <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                selectedDeviceType ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}>
                <Combobox.Input
                  className={`w-full border-none py-2 pl-3 pr-10 text-sm leading-5 focus:ring-0 ${
                    selectedDeviceType ? 'text-gray-900' : 'text-gray-400'
                  }`}
                  onChange={(e) => setQueryBrand(e.target.value)}
                  displayValue={(item: Brand) => item?.name || ''}
                  placeholder="z. B. Apple"
                  disabled={!selectedDeviceType}
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronsUpDown className={`h-5 w-5 ${selectedDeviceType ? 'text-gray-400' : 'text-gray-300'}`} aria-hidden="true" />
                </Combobox.Button>
              </div>
              {selectedDeviceType && (
                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {isLoadingBrands ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                      Lädt Hersteller...
                    </div>
                  ) : filteredBrands.length === 0 ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                      Keine Hersteller für diese Geräteart gefunden.
                    </div>
                  ) : (
                    filter(filteredBrands, queryBrand).map((brand) => (
                      <Combobox.Option
                        key={brand.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-blue-600 text-white' : 'text-gray-900'
                          }`
                        }
                        value={brand}
                      >
                        {({ selected, active }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              {brand.name}
                            </span>
                            {selected ? (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  active ? 'text-white' : 'text-blue-600'
                                }`}
                              >
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              )}
            </div>
          </Combobox>
        </div>
      </div>

      {/* Modell */}
      <div>
        <label className={`block text-sm font-medium mb-1 ${selectedDeviceType ? 'text-gray-700' : 'text-gray-400'}`}>
          Modell
        </label>
        <Combobox
          value={selectedModel}
          onChange={handleModelChange}
          disabled={!selectedDeviceType}
          nullable
        >
          <div className="relative">
            <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              selectedDeviceType ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
            }`}>
              <Combobox.Input
                className={`w-full border-none py-2 pl-3 pr-10 text-sm leading-5 focus:ring-0 ${
                  selectedDeviceType ? 'text-gray-900' : 'text-gray-400'
                }`}
                onChange={(e) => setQueryModel(e.target.value)}
                displayValue={(item: Model) => item?.name || ''}
                placeholder="z. B. iPhone 13"
                disabled={!selectedDeviceType}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronsUpDown className={`h-5 w-5 ${selectedDeviceType ? 'text-gray-400' : 'text-gray-300'}`} aria-hidden="true" />
              </Combobox.Button>
            </div>
            {selectedDeviceType && (
              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {isLoadingModels ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Lädt Modelle...
                  </div>
                ) : filteredModels.length === 0 ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    {selectedBrand 
                      ? `Keine Modelle für ${selectedBrand.name} gefunden.` 
                      : 'Bitte wählen Sie zuerst einen Hersteller aus.'}
                  </div>
                ) : (
                  filter(filteredModels, queryModel).map((model) => (
                    <Combobox.Option
                      key={model.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-blue-600 text-white' : 'text-gray-900'
                        }`
                      }
                      value={model}
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {model.name}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? 'text-white' : 'text-blue-600'
                              }`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            )}
          </div>
        </Combobox>
      </div>
    </div>
  );
}