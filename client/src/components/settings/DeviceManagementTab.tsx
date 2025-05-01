import React, { useState, useRef } from 'react';
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
import { Smartphone, Layers, Tag, AlertCircle, Download, Upload, Database } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export function DeviceManagementTab() {
  const [activeTab, setActiveTab] = useState("deviceTypes");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Nur Admin (Bugi) kann exportieren/importieren
  const canManageDevices = user?.isAdmin && user?.username === 'bugi';
  
  // Funktion zum Exportieren der Gerätedaten
  const handleExportDeviceData = async () => {
    try {
      setIsExporting(true);
      
      // API-Anfrage an den Export-Endpunkt
      const response = await fetch('/api/admin/device-management/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      // CSV-Datei aus der Antwort herunterladen
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `device-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export erfolgreich",
        description: "Die Gerätedaten wurden erfolgreich exportiert."
      });
    } catch (error) {
      console.error("Fehler beim Exportieren der Gerätedaten:", error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Die Gerätedaten konnten nicht exportiert werden.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Datei-Auswahl-Dialog öffnen
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Funktion zum Importieren der Gerätedaten
  const handleImportDeviceData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      
      setIsImporting(true);
      
      // Datei einlesen
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const jsonData = e.target?.result as string;
        
        // API-Anfrage an den Import-Endpunkt
        const response = await apiRequest('POST', '/api/admin/device-management/import', { jsonData });
        const result = await response.json();
        
        // Alle relevanten Abfragen invalidieren, um die UI zu aktualisieren
        await queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/models'] });
        
        toast({
          title: "Import erfolgreich",
          description: `Die Gerätedaten wurden erfolgreich importiert. Hinzugefügt: ${result.stats.deviceTypes} Gerätetypen, ${result.stats.brands} Marken, ${result.stats.modelSeries} Modellreihen, ${result.stats.models} Modelle.`
        });
      };
      
      reader.onerror = () => {
        throw new Error('Datei konnte nicht gelesen werden');
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error("Fehler beim Importieren der Gerätedaten:", error);
      toast({
        title: "Import fehlgeschlagen",
        description: "Die Gerätedaten konnten nicht importiert werden.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      // Zurücksetzen des Datei-Inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
            {canManageDevices && (
              <div className="flex gap-2">
                <Button
                  onClick={handleExportDeviceData}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Daten exportieren
                </Button>
                <Button
                  onClick={handleImportClick}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Daten importieren
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportDeviceData}
                  accept=".json"
                  className="hidden"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deviceTypes" onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-col sm:flex-row w-full mb-6">
              <TabsTrigger value="deviceTypes" className="flex items-center gap-2 justify-start w-full py-3">
                <Smartphone className="h-4 w-4" />
                Gerätetypen
              </TabsTrigger>
              <TabsTrigger value="brands" className="flex items-center gap-2 justify-start w-full py-3">
                <Tag className="h-4 w-4" />
                Marken
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2 justify-start w-full py-3">
                <Layers className="h-4 w-4" />
                Modelle
              </TabsTrigger>
              <TabsTrigger value="issues" className="flex items-center gap-2 justify-start w-full py-3">
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