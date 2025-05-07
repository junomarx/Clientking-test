import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CSVModelImport from './CSVModelImport';
import CSVBrandImport from './CSVBrandImport';

const DeviceDataCSVImportExport: React.FC = () => {
  const { toast } = useToast();
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [selectedExportType, setSelectedExportType] = useState<'brands' | 'models'>('brands');
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Gerätetypen beim Laden der Komponente abrufen
  useEffect(() => {
    const fetchDeviceTypes = async () => {
      try {
        const response = await apiRequest('GET', '/api/superadmin/device-types');
        const data = await response.json();
        setDeviceTypes(data || []);
      } catch (error) {
        console.error('Error fetching device types:', error);
      }
    };
    fetchDeviceTypes();
  }, []);

  // Handler zum Aktualisieren der Daten
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types/all"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] })
      ]);
      
      const response = await apiRequest('GET', '/api/superadmin/device-types');
      const data = await response.json();
      setDeviceTypes(data || []);
      
      toast({
        title: "Daten aktualisiert",
        description: "Die Daten wurden erfolgreich aktualisiert."
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Fehler",
        description: "Die Daten konnten nicht aktualisiert werden.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handler für den Export
  const handleExportCSV = () => {
    try {
      // Erstelle URL mit Query-Parametern
      const exportUrl = `/api/superadmin/device-management/export-csv?type=${selectedExportType}${selectedDeviceType ? `&deviceType=${encodeURIComponent(selectedDeviceType)}` : ''}`;
      
      // Öffne die URL in einem neuen Tab
      window.open(exportUrl, '_blank');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Die Daten konnten nicht exportiert werden.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>CSV Import/Export</CardTitle>
          <CardDescription>
            Import und Export von Gerätetypen, Marken und Modellen im CSV-Format
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefreshData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Daten aktualisieren
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="export">CSV Export</TabsTrigger>
            <TabsTrigger value="import-brands">Marken importieren</TabsTrigger>
            <TabsTrigger value="import-models">Modelle importieren</TabsTrigger>
          </TabsList>
          
          <TabsContent value="export">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exportType">Was möchten Sie exportieren?</Label>
                  <Select value={selectedExportType} onValueChange={(value: 'brands' | 'models') => setSelectedExportType(value)}>
                    <SelectTrigger id="exportType">
                      <SelectValue placeholder="Wählen Sie den Typ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brands">Marken</SelectItem>
                      <SelectItem value="models">Modelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deviceType">Gerätetyp (optional)</Label>
                  <Select value={selectedDeviceType} onValueChange={setSelectedDeviceType}>
                    <SelectTrigger id="deviceType">
                      <SelectValue placeholder="Alle Gerätetypen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Alle Gerätetypen</SelectItem>
                      {deviceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV exportieren
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="import-brands">
            <CSVBrandImport deviceTypes={deviceTypes} onImportComplete={handleRefreshData} />
          </TabsContent>
          
          <TabsContent value="import-models">
            <CSVModelImport deviceTypes={deviceTypes} onImportComplete={handleRefreshData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DeviceDataCSVImportExport;