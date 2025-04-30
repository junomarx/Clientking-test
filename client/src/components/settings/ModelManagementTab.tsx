import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Loader2 } from 'lucide-react';
import { useDeviceTypes } from '@/hooks/useDeviceTypes';
import { useBrands } from '@/hooks/useBrands';
import { useModelSeries } from '@/hooks/useModelSeries';
import { useModels } from '@/hooks/useModels';

export function ModelManagementTab() {
  const { toast } = useToast();
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<number | null>(null);
  const [selectedDeviceTypeName, setSelectedDeviceTypeName] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState<string>('');
  const [newBrandName, setNewBrandName] = useState<string>('');
  const [selectedModelSeriesId, setSelectedModelSeriesId] = useState<number | null>(null);
  const [selectedModelSeriesName, setSelectedModelSeriesName] = useState<string>('');
  const [newModelSeries, setNewModelSeries] = useState<string>('');
  const [models, setModels] = useState<string>('');

  // API-Hooks
  const { getAllDeviceTypes } = useDeviceTypes();
  const { getBrandsByDeviceTypeId, createBrand } = useBrands();
  const { getModelSeriesByBrandId, createModelSeries, deleteModelSeries, deleteAllModelSeriesForBrand } = useModelSeries();
  const { getModelsByModelSeriesId, updateAllModelsForModelSeries } = useModels();

  // Abfragen für Daten
  const deviceTypesQuery = getAllDeviceTypes();
  const brandsQuery = getBrandsByDeviceTypeId(selectedDeviceTypeId);
  const modelSeriesQuery = getModelSeriesByBrandId(selectedBrandId);
  const modelsQuery = getModelsByModelSeriesId(selectedModelSeriesId);

  // Mutations
  const createBrandMutation = createBrand();
  const createModelSeriesMutation = createModelSeries();
  const deleteModelSeriesMutation = deleteModelSeries();
  const deleteAllModelSeriesForBrandMutation = deleteAllModelSeriesForBrand();
  const updateAllModelsForModelSeriesMutation = updateAllModelsForModelSeries();

  // Standard-Gerätetypen für die Auswahl, wenn noch keine in der DB vorhanden sind
  const defaultDeviceTypes = ['Smartphone', 'Tablet', 'Watch', 'Laptop', 'Spielekonsole'];

  // Wenn ein Gerätetyp ausgewählt wird
  useEffect(() => {
    if (selectedDeviceTypeId) {
      // Zurücksetzen der abhängigen Auswahlen
      setSelectedBrandId(null);
      setSelectedBrandName('');
      setSelectedModelSeriesId(null);
      setSelectedModelSeriesName('');
      setModels('');
    }
  }, [selectedDeviceTypeId]);

  // Wenn eine Marke ausgewählt wird
  useEffect(() => {
    if (selectedBrandId) {
      // Zurücksetzen der abhängigen Auswahlen
      setSelectedModelSeriesId(null);
      setSelectedModelSeriesName('');
      setModels('');
      
      // Wähle die erste verfügbare Modellreihe aus, falls vorhanden
      if (modelSeriesQuery.data && modelSeriesQuery.data.length > 0) {
        setSelectedModelSeriesId(modelSeriesQuery.data[0].id);
        setSelectedModelSeriesName(modelSeriesQuery.data[0].name);
      }
      // Hinweis: Die automatische Erstellung der Standard-Modellreihe wurde entfernt,
      // da sie zu unerwünschten Toast-Nachrichten führte
    }
  }, [selectedBrandId, modelSeriesQuery.data]);

  // Wenn eine Modellreihe ausgewählt wird, lade die zugehörigen Modelle
  useEffect(() => {
    if (selectedModelSeriesId && modelsQuery.data) {
      // Formatiere die Modelle als mehrzeiligen Text
      setModels(modelsQuery.data.map(model => model.name).join('\n'));
    } else {
      setModels('');
    }
  }, [selectedModelSeriesId, modelsQuery.data]);

  // Funktion zum Hinzufügen einer neuen Modellreihe
  const handleAddNewModelSeries = () => {
    if (!selectedBrandId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie erst eine Marke aus',
        variant: 'destructive'
      });
      return;
    }
    
    if (!newModelSeries || newModelSeries.trim() === '') {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie einen Namen für die Modellreihe ein',
        variant: 'destructive'
      });
      return;
    }
    
    console.log(`Erstelle neue Modellreihe: ${newModelSeries} für Marke ${selectedBrandId}`);
    
    createModelSeriesMutation.mutate({
      name: newModelSeries.trim(),
      brandId: selectedBrandId
    }, {
      onSuccess: (newModelSeries) => {
        console.log('Modellreihe erstellt:', newModelSeries);
        setSelectedModelSeriesId(newModelSeries.id);
        setSelectedModelSeriesName(newModelSeries.name);
        setNewModelSeries(''); // Leere das Eingabefeld
      },
      onError: (error) => {
        console.error('Fehler beim Erstellen der Modellreihe:', error);
        toast({
          title: 'Fehler',
          description: `Fehler beim Erstellen der Modellreihe: ${error instanceof Error ? error.message : String(error)}`,
          variant: 'destructive'
        });
      }
    });
  };

  // Funktion zum Speichern der eingegebenen Modelle
  const handleSaveModels = () => {
    if (!selectedModelSeriesId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Gerätetyp, eine Marke und eine Modellreihe aus.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Teile den Text in Zeilen und entferne leere Zeilen
      const newModels = models
        .split('\n')
        .map(model => model.trim())
        .filter(model => model.length > 0);

      // Speichere alle neuen Modelle
      updateAllModelsForModelSeriesMutation.mutate({
        modelSeriesId: selectedModelSeriesId,
        models: newModels
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: `Fehler beim Speichern der Modelle: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive'
      });
    }
  };

  // Neue Marke hinzufügen
  const handleAddNewBrand = () => {
    if (!selectedDeviceTypeId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie erst einen Gerätetyp aus',
        variant: 'destructive'
      });
      return;
    }
    
    if (!newBrandName || newBrandName.trim() === '') {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie einen Namen für die Marke ein',
        variant: 'destructive'
      });
      return;
    }
    
    console.log(`Erstelle neue Marke: ${newBrandName} für Gerätetyp ${selectedDeviceTypeId}`);
    
    createBrandMutation.mutate({
      name: newBrandName.trim(),
      deviceTypeId: selectedDeviceTypeId
    }, {
      onSuccess: (newBrand) => {
        console.log('Marke erstellt:', newBrand);
        setSelectedBrandId(newBrand.id);
        setSelectedBrandName(newBrand.name);
        setNewBrandName('');
      },
      onError: (error) => {
        console.error('Fehler beim Erstellen der Marke:', error);
        toast({
          title: 'Fehler',
          description: `Fehler beim Erstellen der Marke: ${error instanceof Error ? error.message : String(error)}`,
          variant: 'destructive'
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelle verwalten</CardTitle>
          <CardDescription>
            Verwalten Sie Gerätemodelle für verschiedene Marken und Gerätetypen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lade-Indikator anzeigen, wenn Daten geladen werden */}
          {deviceTypesQuery.isLoading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Fehler anzeigen, wenn etwas schief gelaufen ist */}
          {deviceTypesQuery.isError && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p>Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.</p>
              <p className="text-xs mt-2">{deviceTypesQuery.error instanceof Error ? deviceTypesQuery.error.message : 'Unbekannter Fehler'}</p>
            </div>
          )}

          {/* Hauptinhalt anzeigen, wenn Daten geladen sind */}
          {deviceTypesQuery.isSuccess && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gerätetyp-Auswahl */}
                <div className="space-y-2">
                  <Label htmlFor="deviceType">Gerätetyp</Label>
                  <Select 
                    value={selectedDeviceTypeId?.toString() || ''} 
                    onValueChange={(value) => {
                      const deviceType = deviceTypesQuery.data.find(dt => dt.id.toString() === value);
                      if (deviceType) {
                        setSelectedDeviceTypeId(deviceType.id);
                        setSelectedDeviceTypeName(deviceType.name);
                      } else {
                        setSelectedDeviceTypeId(null);
                        setSelectedDeviceTypeName('');
                      }
                    }}
                  >
                    <SelectTrigger id="deviceType">
                      <SelectValue placeholder="Gerätetyp auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypesQuery.data.length > 0 ? (
                        deviceTypesQuery.data.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                        ))
                      ) : (
                        defaultDeviceTypes.map((type, index) => (
                          <SelectItem key={index} value={`default-${index}`}>{type}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Marken-Auswahl mit Option für neue Marke */}
                <div className="space-y-2">
                  <Label htmlFor="brand">Marke</Label>
                  <div className="flex gap-2">
                    {brandsQuery.isLoading ? (
                      <div className="flex justify-center items-center w-full h-10 bg-muted rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Select 
                        value={selectedBrandId?.toString() || ''}
                        onValueChange={(value) => {
                          if (brandsQuery.data) {
                            const brand = brandsQuery.data.find(b => b.id.toString() === value);
                            if (brand) {
                              setSelectedBrandId(brand.id);
                              setSelectedBrandName(brand.name);
                            }
                          }
                        }}
                        disabled={!selectedDeviceTypeId || brandsQuery.isLoading}
                      >
                        <SelectTrigger id="brand" className="flex-grow">
                          <SelectValue placeholder={selectedDeviceTypeId ? "Marke auswählen" : "Erst Gerätetyp auswählen"} />
                        </SelectTrigger>
                        <SelectContent>
                          {brandsQuery.data && brandsQuery.data.map((b) => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                          ))}
                          {/* Eingabefeld für neue Marke */}
                          <div className="px-2 py-1.5 text-sm border-t">
                            <input 
                              type="text" 
                              className="w-full p-1 border rounded"
                              placeholder="Neue Marke eingeben"
                              value={newBrandName}
                              onChange={(e) => setNewBrandName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </SelectContent>
                      </Select>
                    )}
                    
                    {/* Button zum Hinzufügen neuer Marke */}
                    {selectedDeviceTypeId && newBrandName && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleAddNewBrand}
                        className="whitespace-nowrap"
                        disabled={createBrandMutation.isPending}
                      >
                        {createBrandMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        Marke hinzufügen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Modellreihen-Auswahl, nur anzeigen wenn eine Marke ausgewählt ist */}
              {selectedDeviceTypeId && selectedBrandId && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="modelSeries">Modellreihe</Label>
                      {modelSeriesQuery.data && modelSeriesQuery.data.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            if (window.confirm(`Möchten Sie wirklich alle Modellreihen für ${selectedDeviceTypeName} - ${selectedBrandName} löschen?`)) {
                              // Alle Modellreihen für diese Marke löschen
                              deleteAllModelSeriesForBrandMutation.mutate(selectedBrandId);
                              // Auswahl zurücksetzen
                              setSelectedModelSeriesId(null);
                              setSelectedModelSeriesName('');
                              setModels('');
                            }
                          }}
                          disabled={deleteAllModelSeriesForBrandMutation.isPending}
                        >
                          {deleteAllModelSeriesForBrandMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : null}
                          Alle Modellreihen löschen
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {modelSeriesQuery.isLoading ? (
                        <div className="flex justify-center items-center w-full h-10 bg-muted rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <Select 
                          value={selectedModelSeriesId?.toString() || ''}
                          onValueChange={(value) => {
                            if (modelSeriesQuery.data) {
                              const modelSeries = modelSeriesQuery.data.find(ms => ms.id.toString() === value);
                              if (modelSeries) {
                                setSelectedModelSeriesId(modelSeries.id);
                                setSelectedModelSeriesName(modelSeries.name);
                              }
                            }
                          }}
                        >
                          <SelectTrigger id="modelSeries" className="flex-grow">
                            <SelectValue placeholder="Modellreihe auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {modelSeriesQuery.data && modelSeriesQuery.data.map((series) => (
                              <div key={series.id} className="flex items-center justify-between px-2">
                                <SelectItem value={series.id.toString()}>{series.name}</SelectItem>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-destructive hover:text-destructive/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Bestätigung abfragen
                                    if (window.confirm(`Möchten Sie die Modellreihe "${series.name}" wirklich löschen?`)) {
                                      // Modellreihe löschen
                                      deleteModelSeriesMutation.mutate(series.id);
                                      // Wenn die aktuell ausgewählte Modellreihe gelöscht wurde, Auswahl zurücksetzen
                                      if (selectedModelSeriesId === series.id) {
                                        setSelectedModelSeriesId(null);
                                        setSelectedModelSeriesName('');
                                        setModels('');
                                      }
                                    }
                                  }}
                                  disabled={deleteModelSeriesMutation.isPending}
                                >
                                  <span className="text-red-500">✕</span>
                                </Button>
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {/* Eingabefeld für neue Modellreihe */}
                      <div className="relative flex-grow">
                        <Input
                          placeholder="Neue Modellreihe"
                          value={newModelSeries}
                          onChange={(e) => setNewModelSeries(e.target.value)}
                        />
                      </div>
                      
                      {/* Button zum Hinzufügen neuer Modellreihe */}
                      {newModelSeries && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleAddNewModelSeries}
                          className="whitespace-nowrap flex items-center gap-1"
                          disabled={createModelSeriesMutation.isPending}
                        >
                          {createModelSeriesMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          Hinzufügen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Modelle-Eingabefeld */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="models">
                    {selectedModelSeriesName 
                      ? `Modelle für ${selectedBrandName} ${selectedModelSeriesName}` 
                      : 'Modelle'} (ein Modell pro Zeile)
                  </Label>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveModels} 
                      size="sm"
                      disabled={
                        !selectedDeviceTypeId || 
                        !selectedBrandId || 
                        !selectedModelSeriesId || 
                        updateAllModelsForModelSeriesMutation.isPending ||
                        modelsQuery.isLoading
                      }
                      className="flex items-center gap-1"
                    >
                      {updateAllModelsForModelSeriesMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Modelle speichern
                    </Button>
                  </div>
                </div>
                {modelsQuery.isLoading && selectedModelSeriesId ? (
                  <div className="flex justify-center items-center py-8 bg-muted/20 rounded-md">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Textarea
                    id="models"
                    placeholder={selectedDeviceTypeId && selectedBrandId && selectedModelSeriesId
                      ? `Geben Sie hier Modelle für ${selectedBrandName} ${selectedModelSeriesName} ein (ein Modell pro Zeile)`
                      : "Bitte wählen Sie zuerst Gerätetyp, Marke und Modellreihe aus"
                    }
                    value={models}
                    onChange={(e) => setModels(e.target.value)}
                    disabled={!selectedDeviceTypeId || !selectedBrandId || !selectedModelSeriesId}
                    className="min-h-[200px] font-mono text-sm"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Aktuell gespeichert: {modelsQuery.data?.length || 0} Modelle 
                  {selectedModelSeriesName && ` für ${selectedModelSeriesName}`}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}