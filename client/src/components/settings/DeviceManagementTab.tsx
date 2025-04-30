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
import { ModelManagementTab } from './ModelManagementTab';
import { DeviceIssuesTab } from './DeviceIssuesTab';
import { Smartphone, Layers, Tag, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function DeviceManagementTab() {
  const [activeTab, setActiveTab] = useState("deviceTypes");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Die Funktion handleAppleModelUpdate wurde entfernt

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
            {/* Der Button 'iPhone Modelle aktualisieren' wurde entfernt */}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deviceTypes" onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="deviceTypes" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Gerätetypen
              </TabsTrigger>
              <TabsTrigger value="brands" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Marken
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Modelle
              </TabsTrigger>
              <TabsTrigger value="issues" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Fehlerbeschreibungen
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="deviceTypes">
              <DeviceTypeSettings />
            </TabsContent>
            
            <TabsContent value="brands">
              <BrandSettings />
            </TabsContent>
            
            <TabsContent value="models">
              <ModelManagementTab />
            </TabsContent>
            
            <TabsContent value="issues">
              <DeviceIssuesTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}