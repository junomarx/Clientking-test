import React, { useState, useEffect } from 'react';
import { 
  useGlobalDeviceTypes, 
  useGlobalBrandsByDeviceType, 
  useGlobalModelsByBrand, 
  type GlobalDeviceType, 
  type GlobalBrand, 
  type GlobalModel 
} from '@/hooks/useGlobalDeviceData';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<number | null>(null);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Datenabfragen mit React Query
  const deviceTypesQuery = useGlobalDeviceTypes();
  const brandsQuery = useGlobalBrandsByDeviceType(selectedDeviceTypeId);
  const modelsQuery = useGlobalModelsByBrand(selectedDeviceTypeId, selectedBrandId);

  // Optionen für die Comboboxen formatieren
  const deviceTypeOptions: ComboboxOption[] = deviceTypesQuery.data 
    ? deviceTypesQuery.data.map((deviceType: GlobalDeviceType) => ({
        value: deviceType.id.toString(),
        label: deviceType.name
      }))
    : [];

  const brandOptions: ComboboxOption[] = brandsQuery.data 
    ? brandsQuery.data.map((brand: GlobalBrand) => ({
        value: brand.id.toString(),
        label: brand.name
      }))
    : [];

  const modelOptions: ComboboxOption[] = modelsQuery.data 
    ? modelsQuery.data.map((model: GlobalModel) => ({
        value: model.id.toString(),
        label: model.name
      }))
    : [];

  // Handler für Gerätetyp-Änderung
  const handleDeviceTypeChange = (value: string) => {
    const deviceTypeId = value ? parseInt(value, 10) : null;
    setSelectedDeviceTypeId(deviceTypeId);
    
    // Den Namen des Gerätetyps finden
    const deviceType = deviceTypesQuery.data?.find(
      (dt: GlobalDeviceType) => dt.id === deviceTypeId
    );
    const deviceTypeName = deviceType?.name || '';
    setSelectedDeviceType(deviceTypeName);
    
    // Callback aufrufen
    onDeviceTypeSelect(deviceTypeName, deviceTypeId);
    
    // Zurücksetzen der abhängigen Felder
    setSelectedBrandId(null);
    setSelectedBrand('');
    onBrandSelect('', null);
    setSelectedModelId(null);
    setSelectedModel('');
    onModelSelect('', null);
  };

  // Handler für Marken-Änderung
  const handleBrandChange = (value: string) => {
    const brandId = value ? parseInt(value, 10) : null;
    setSelectedBrandId(brandId);
    
    // Den Namen der Marke finden
    const brand = brandsQuery.data?.find(
      (b: GlobalBrand) => b.id === brandId
    );
    const brandName = brand?.name || '';
    setSelectedBrand(brandName);
    
    // Callback aufrufen
    onBrandSelect(brandName, brandId);
    
    // Zurücksetzen der abhängigen Felder
    setSelectedModelId(null);
    setSelectedModel('');
    onModelSelect('', null);
  };

  // Handler für Modell-Änderung
  const handleModelChange = (value: string) => {
    const modelId = value ? parseInt(value, 10) : null;
    setSelectedModelId(modelId);
    
    // Den Namen des Modells finden
    const model = modelsQuery.data?.find(
      (m: GlobalModel) => m.id === modelId
    );
    const modelName = model?.name || '';
    setSelectedModel(modelName);
    
    // Callback aufrufen
    onModelSelect(modelName, modelId);
  };

  return (
    <div className={className}>
      <div className="grid gap-4">
        {/* Gerätetyp-Auswahl */}
        <div className="space-y-2">
          <Label htmlFor="deviceType">Geräteart</Label>
          {deviceTypesQuery.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Combobox
              options={deviceTypeOptions}
              value={selectedDeviceTypeId?.toString() || ''}
              onChange={handleDeviceTypeChange}
              placeholder="Geräteart auswählen..."
              searchPlaceholder="Nach Geräteart suchen..."
              emptyText="Keine Gerätearten gefunden"
              loading={deviceTypesQuery.isLoading}
            />
          )}
        </div>

        {/* Marken-Auswahl (nur anzeigen, wenn Gerätetyp ausgewählt ist) */}
        {selectedDeviceTypeId && (
          <div className="space-y-2">
            <Label htmlFor="brand">Hersteller</Label>
            {brandsQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Combobox
                options={brandOptions}
                value={selectedBrandId?.toString() || ''}
                onChange={handleBrandChange}
                placeholder="Hersteller auswählen..."
                searchPlaceholder="Nach Hersteller suchen..."
                emptyText="Keine Hersteller für diese Geräteart gefunden"
                loading={brandsQuery.isLoading}
              />
            )}
          </div>
        )}

        {/* Modell-Auswahl (nur anzeigen, wenn Marke ausgewählt ist) */}
        {selectedBrandId && (
          <div className="space-y-2">
            <Label htmlFor="model">Modell</Label>
            {modelsQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Combobox
                options={modelOptions}
                value={selectedModelId?.toString() || ''}
                onChange={handleModelChange}
                placeholder="Modell auswählen..."
                searchPlaceholder="Nach Modell suchen..."
                emptyText="Keine Modelle für diesen Hersteller gefunden"
                loading={modelsQuery.isLoading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}