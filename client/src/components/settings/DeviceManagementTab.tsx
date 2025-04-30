import React, { useState } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeviceTypeSettings } from './DeviceTypeSettings';
import { BrandSettings } from './BrandSettings';
import { ModelSeriesSettings } from './ModelSeriesSettings';
import { Smartphone, Layers, Tag, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { updateAppleModels } from '@/lib/updateAppleModels';

export function DeviceManagementTab() {
  const [activeTab, setActiveTab] = useState("deviceTypes");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAppleModelUpdate = async () => {
    try {
      await updateAppleModels();
      
      // Aktualisiere die Daten
      queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      
      toast({
        title: "iPhone Modelle aktualisiert",
        description: "Alle iPhone Modelle wurden erfolgreich aktualisiert.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "iPhone Modelle konnten nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Globale Geräteverwaltung</CardTitle>
              <CardDescription>
                Zentrale Verwaltung für alle Gerätetypen, Marken und Modellreihen
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAppleModelUpdate}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" /> iPhone Modelle aktualisieren
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deviceTypes" onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="deviceTypes" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Gerätetypen
              </TabsTrigger>
              <TabsTrigger value="brands" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Marken
              </TabsTrigger>
              <TabsTrigger value="modelSeries" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Modellreihen
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="deviceTypes">
              <DeviceTypeSettings />
            </TabsContent>
            
            <TabsContent value="brands">
              <BrandSettings />
            </TabsContent>
            
            <TabsContent value="modelSeries">
              <ModelSeriesSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}