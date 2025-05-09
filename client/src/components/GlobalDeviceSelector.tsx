import React, { useState, useMemo } from 'react';
import { 
  useGlobalDeviceTypes, 
  useGlobalBrandsByDeviceType, 
  useGlobalModelsByBrand, 
  type GlobalDeviceType, 
  type GlobalBrand, 
  type GlobalModel 
} from '@/hooks/useGlobalDeviceData';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

interface GlobalDeviceSelectorProps {
  onDeviceTypeSelect: (deviceType: string, deviceTypeId: number | null) => void;
  onBrandSelect: (brand: string, brandId: number | null) => void;
  onModelSelect: (model: string, modelId: number | null) => void;
  className?: string;
}

export function GlobalDeviceSelector({
  onDeviceTypeSelect,
  onBrandSelect,
  onModelSelect,
  className
}: GlobalDeviceSelectorProps) {
  // State für die ausgewählten Werte
  const [selectedDeviceType, setSelectedDeviceType] = useState<GlobalDeviceType | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<GlobalBrand | null>(null);
  const [selectedModel, setSelectedModel] = useState<GlobalModel | null>(null);

  // State für die Suche
  const [queryDeviceType, setQueryDeviceType] = useState('');
  const [queryBrand, setQueryBrand] = useState('');
  const [queryModel, setQueryModel] = useState('');

  // Datenabfragen mit React Query
  const deviceTypesQuery = useGlobalDeviceTypes();
  const brandsQuery = useGlobalBrandsByDeviceType(selectedDeviceType?.id || null);
  const modelsQuery = useGlobalModelsByBrand(selectedDeviceType?.id || null, selectedBrand?.id || null);

  // Gefilterte Optionen
  const filteredDeviceTypes = useMemo(() => {
    return deviceTypesQuery.data 
      ? deviceTypesQuery.data.filter((deviceType) => 
          deviceType.name.toLowerCase().includes(queryDeviceType.toLowerCase())
        )
      : [];
  }, [deviceTypesQuery.data, queryDeviceType]);

  const filteredBrands = useMemo(() => {
    return brandsQuery.data 
      ? brandsQuery.data.filter((brand) => 
          brand.name.toLowerCase().includes(queryBrand.toLowerCase())
        )
      : [];
  }, [brandsQuery.data, queryBrand]);

  const filteredModels = useMemo(() => {
    return modelsQuery.data 
      ? modelsQuery.data.filter((model) => 
          model.name.toLowerCase().includes(queryModel.toLowerCase())
        )
      : [];
  }, [modelsQuery.data, queryModel]);

  // Handler für Auswahl-Änderungen
  const handleDeviceTypeChange = (deviceType: GlobalDeviceType | null) => {
    setSelectedDeviceType(deviceType);
    setSelectedBrand(null);
    setSelectedModel(null);
    
    onDeviceTypeSelect(deviceType?.name || '', deviceType?.id || null);
    onBrandSelect('', null);
    onModelSelect('', null);
  };

  const handleBrandChange = (brand: GlobalBrand | null) => {
    setSelectedBrand(brand);
    setSelectedModel(null);
    
    onBrandSelect(brand?.name || '', brand?.id || null);
    onModelSelect('', null);
  };

  const handleModelChange = (model: GlobalModel | null) => {
    setSelectedModel(model);
    onModelSelect(model?.name || '', model?.id || null);
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Zeile: Geräteart und Hersteller */}
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Geräteart */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Geräteart</label>
            <Combobox value={selectedDeviceType} onChange={handleDeviceTypeChange}>
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-input shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Combobox.Input
                    className="w-full border-none py-3 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    onChange={(e) => setQueryDeviceType(e.target.value)}
                    displayValue={(deviceType: GlobalDeviceType) => deviceType?.name || ''}
                    placeholder="Geräteart auswählen"
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Combobox.Button>
                </div>
                <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredDeviceTypes.length === 0 && queryDeviceType !== '' ? (
                    <div className="relative cursor-default select-none py-3 px-4 text-gray-700">
                      Keine Gerätearten gefunden.
                    </div>
                  ) : (
                    filteredDeviceTypes.map((deviceType) => (
                      <Combobox.Option
                        key={deviceType.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-3 pl-10 pr-4 ${
                            active ? 'bg-primary text-white' : 'text-gray-900'
                          }`
                        }
                        value={deviceType}
                      >
                        {({ selected, active }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              {deviceType.name}
                            </span>
                            {selected ? (
                              <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary'}`}>
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
            {deviceTypesQuery.isLoading && (
              <div className="mt-1 h-10 w-full animate-pulse rounded bg-gray-200"></div>
            )}
          </div>

          {/* Hersteller */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Hersteller</label>
            <Combobox value={selectedBrand} onChange={handleBrandChange} disabled={!selectedDeviceType}>
              <div className="relative">
                <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-input shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${!selectedDeviceType ? 'opacity-50' : ''}`}>
                  <Combobox.Input
                    className="w-full border-none py-3 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    onChange={(e) => setQueryBrand(e.target.value)}
                    displayValue={(brand: GlobalBrand) => brand?.name || ''}
                    placeholder="Hersteller auswählen"
                    disabled={!selectedDeviceType}
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Combobox.Button>
                </div>
                {selectedDeviceType && (
                  <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {filteredBrands.length === 0 && queryBrand !== '' ? (
                      <div className="relative cursor-default select-none py-3 px-4 text-gray-700">
                        Keine Hersteller gefunden.
                      </div>
                    ) : (
                      filteredBrands.map((brand) => (
                        <Combobox.Option
                          key={brand.id}
                          className={({ active }) =>
                            `relative cursor-default select-none py-3 pl-10 pr-4 ${
                              active ? 'bg-primary text-white' : 'text-gray-900'
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
                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary'}`}>
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
            {brandsQuery.isLoading && selectedDeviceType && (
              <div className="mt-1 h-10 w-full animate-pulse rounded bg-gray-200"></div>
            )}
          </div>
        </div>

        {/* Modell */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Modell</label>
          <Combobox value={selectedModel} onChange={handleModelChange} disabled={!selectedBrand}>
            <div className="relative">
              <div className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-input shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${!selectedBrand ? 'opacity-50' : ''}`}>
                <Combobox.Input
                  className="w-full border-none py-3 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                  onChange={(e) => setQueryModel(e.target.value)}
                  displayValue={(model: GlobalModel) => model?.name || ''}
                  placeholder="Modell auswählen"
                  disabled={!selectedBrand}
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronsUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </Combobox.Button>
              </div>
              {selectedBrand && (
                <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredModels.length === 0 && queryModel !== '' ? (
                    <div className="relative cursor-default select-none py-3 px-4 text-gray-700">
                      Keine Modelle gefunden.
                    </div>
                  ) : (
                    filteredModels.map((model) => (
                      <Combobox.Option
                        key={model.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-3 pl-10 pr-4 ${
                            active ? 'bg-primary text-white' : 'text-gray-900'
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
                              <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary'}`}>
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
          {modelsQuery.isLoading && selectedBrand && (
            <div className="mt-1 h-10 w-full animate-pulse rounded bg-gray-200"></div>
          )}
        </div>
      </div>
    </div>
  );
}