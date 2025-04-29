import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Smartphone, Save } from 'lucide-react';
import { updateAppleModels } from '@/lib/updateAppleModels';
import {
  saveModel,
  getModelsForDeviceAndBrand,
  deleteModel,
  getBrandsForDeviceType,
  saveBrand
} from '@/lib/localStorage';

export function ModelManagementTab() {
  const { toast } = useToast();
  const [deviceType, setDeviceType] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [models, setModels] = useState<string>('');
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Standard-Gerätetypen für die Auswahl
  const deviceTypes = ['Smartphone', 'Tablet', 'Watch', 'Laptop', 'Spielekonsole'];

  // Beim Ändern des Gerätetyps die verfügbaren Marken aktualisieren
  useEffect(() => {
    if (deviceType) {
      const brands = getBrandsForDeviceType(deviceType);
      setAvailableBrands(brands);
      setBrand(''); // Marke zurücksetzen
      setModels(''); // Modelle zurücksetzen
    }
  }, [deviceType]);

  // Beim Ändern der Marke die verfügbaren Modelle aktualisieren
  useEffect(() => {
    if (deviceType && brand) {
      const deviceModels = getModelsForDeviceAndBrand(deviceType, brand);
      setAvailableModels(deviceModels);
      setModels(deviceModels.join('\n')); // Modelle als mehrzeiliger Text
    }
  }, [deviceType, brand]);

  // Funktion zum Aktualisieren der iPhone-Modelle
  const handleUpdateAppleModels = () => {
    try {
      const result = updateAppleModels();
      toast({
        title: 'iPhone-Modelle aktualisiert',
        description: `${result.oldCount} alte Modelle wurden durch ${result.newCount} aktuelle iPhone-Modelle ersetzt.`,
      });
      
      // Wenn aktuell Smartphone/Apple ausgewählt ist, aktualisiere die Anzeige
      if (deviceType === 'Smartphone' && brand === 'Apple') {
        const updatedModels = getModelsForDeviceAndBrand('Smartphone', 'Apple');
        setAvailableModels(updatedModels);
        setModels(updatedModels.join('\n'));
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der iPhone-Modelle: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive'
      });
    }
  };

  // Funktion zum Speichern der eingegebenen Modelle
  const handleSaveModels = () => {
    if (!deviceType || !brand) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Gerätetyp und eine Marke aus.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Lösche zuerst alle existierenden Modelle für diese Kombination
      availableModels.forEach(model => {
        deleteModel(deviceType, brand, model);
      });

      // Teile den Text in Zeilen und entferne leere Zeilen
      const newModels = models
        .split('\n')
        .map(model => model.trim())
        .filter(model => model.length > 0);

      // Speichere alle neuen Modelle
      newModels.forEach(model => {
        saveModel(deviceType, brand, model);
      });

      // Aktualisiere die Liste der verfügbaren Modelle
      setAvailableModels(newModels);

      toast({
        title: 'Modelle gespeichert',
        description: `${newModels.length} Modelle für ${deviceType} - ${brand} wurden erfolgreich gespeichert.`
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
    if (!deviceType || !brand) return;
    
    saveBrand(deviceType, brand);
    
    // Aktualisiere die Liste der verfügbaren Marken
    const updatedBrands = getBrandsForDeviceType(deviceType);
    setAvailableBrands(updatedBrands);
    
    toast({
      title: 'Marke hinzugefügt',
      description: `Die Marke "${brand}" wurde für "${deviceType}" hinzugefügt.`
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gerätetyp-Auswahl */}
            <div className="space-y-2">
              <Label htmlFor="deviceType">Gerätetyp</Label>
              <Select 
                value={deviceType} 
                onValueChange={setDeviceType}
              >
                <SelectTrigger id="deviceType">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Marken-Auswahl mit Option für neue Marke */}
            <div className="space-y-2">
              <Label htmlFor="brand">Marke</Label>
              <div className="flex gap-2">
                <Select 
                  value={brand} 
                  onValueChange={setBrand}
                  disabled={!deviceType}
                >
                  <SelectTrigger id="brand" className="flex-grow">
                    <SelectValue placeholder={deviceType ? "Marke auswählen" : "Erst Gerätetyp auswählen"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBrands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                    {/* Eingabefeld für neue Marke */}
                    <div className="px-2 py-1.5 text-sm border-t">
                      <input 
                        type="text" 
                        className="w-full p-1 border rounded"
                        placeholder="Neue Marke eingeben"
                        value={!availableBrands.includes(brand) ? brand : ''}
                        onChange={(e) => setBrand(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </SelectContent>
                </Select>
                
                {/* Button zum Hinzufügen neuer Marke */}
                {deviceType && brand && !availableBrands.includes(brand) && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleAddNewBrand}
                    className="whitespace-nowrap"
                  >
                    Marke hinzufügen
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Modelle-Eingabefeld */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="models">Modelle (ein Modell pro Zeile)</Label>
              <div className="flex gap-2">
                {deviceType === 'Smartphone' && brand === 'Apple' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleUpdateAppleModels}
                    className="flex items-center gap-1"
                  >
                    <Smartphone className="h-3 w-3" />
                    <RefreshCw className="h-3 w-3" />
                    iPhone-Modelle aktualisieren
                  </Button>
                )}
                <Button 
                  onClick={handleSaveModels} 
                  size="sm"
                  disabled={!deviceType || !brand}
                  className="flex items-center gap-1"
                >
                  <Save className="h-3 w-3" />
                  Modelle speichern
                </Button>
              </div>
            </div>
            <Textarea
              id="models"
              placeholder={deviceType && brand 
                ? "Geben Sie hier Modelle ein (ein Modell pro Zeile)"
                : "Bitte wählen Sie zuerst einen Gerätetyp und eine Marke aus"
              }
              value={models}
              onChange={(e) => setModels(e.target.value)}
              disabled={!deviceType || !brand}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Aktuell gespeichert: {availableModels.length} Modelle
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
