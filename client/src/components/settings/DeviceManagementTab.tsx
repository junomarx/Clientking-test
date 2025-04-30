import React from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { DeviceTypeSettings } from './DeviceTypeSettings';
import { BrandSettings } from './BrandSettings';
import { ModelSeriesSettings } from './ModelSeriesSettings';
import { Smartphone, Layers, Tag } from 'lucide-react';

export function DeviceManagementTab() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="deviceTypes" className="space-y-4">
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
    </div>
  );
}