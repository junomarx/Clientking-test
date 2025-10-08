import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Download, Upload, Check, RefreshCw, Gamepad2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ConsoleSampleData from "@/assets/data/console-sample-data.json";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CSVModelImport from './CSVModelImport';

const DeviceDataExportImportWithCSV: React.FC = () => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Funktion zum Aktualisieren aller Daten
  const refreshAllData = async () => {
    setIsRefreshing(true);
    console.log("Manuelles Aktualisieren aller Daten...");
    
    try {
      // Alle relevanten Abfragen invalidieren
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types/all"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] })
      ]);
      
      // Alle Abfragen explizit neu laden
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/superadmin/device-types"] }),
        queryClient.refetchQueries({ queryKey: ["/api/superadmin/device-types/all"] }),
        queryClient.refetchQueries({ queryKey: ["/api/superadmin/brands"] }),
        queryClient.refetchQueries({ queryKey: ["/api/superadmin/models"] }),
        queryClient.refetchQueries({ queryKey: ["/api/superadmin/device-issues"] })
      ]);
      
      console.log("Alle Daten wurden aktualisiert");
      toast({
        title: "Daten aktualisiert",
        description: "Alle Gerätedaten wurden erfolgreich aktualisiert.",
      });
      
      // Gerätetypen neu laden
      const response = await apiRequest('GET', '/api/superadmin/device-types');
      const data = await response.json();
      setDeviceTypes(data || []);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Daten:", error);
      toast({
        title: "Aktualisierung fehlgeschlagen",
        description: "Die Daten konnten nicht aktualisiert werden.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mutation für den Export
  const exportMutation = useMutation({
    mutationFn: async () => {
      setIsExporting(true);
      try {
        const response = await apiRequest("GET", "/api/superadmin/device-management/export");
        
        if (!response.ok) {
          throw new Error("Fehler beim Exportieren der Daten");
        }
        
        return await response.json();
      } finally {
        setIsExporting(false);
      }
    },
    onSuccess: (data) => {
      // Daten als JSON-Datei herunterladen
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `geraete-daten-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Statistik anzeigen
      toast({
        title: "Export erfolgreich",
        description: `Es wurden ${data.deviceTypes.length} Gerätearten, ${data.brands.length} Hersteller, ${data.models.length} Modelle und ${data.deviceIssues.length} Fehlereinträge exportiert.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export fehlgeschlagen",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation für den Import
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsImporting(true);
      setImportProgress(10);
      
      try {
        // Datei einlesen
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        
        setImportProgress(30);
        
        // JSON parsen
        const jsonData = JSON.parse(fileData);
        
        setImportProgress(50);
        
        // Daten an den Server senden
        // Füge Debugging-Informationen hinzu
        console.log('Import-Daten:', jsonData);
        
        // Achte darauf, dass der Content-Type korrekt gesetzt ist
        const response = await fetch('/api/superadmin/device-management/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': localStorage.getItem('userId') || ''
          },
          body: JSON.stringify(jsonData),
          credentials: 'include'
        });
        
        setImportProgress(80);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Fehler beim Importieren der Daten");
        }
        
        setImportProgress(100);
        
        return await response.json();
      } finally {
        setTimeout(() => {
          setIsImporting(false);
          setImportProgress(0);
        }, 1000);
      }
    },
    onSuccess: (data) => {
      console.log("Import erfolgreich, invalidiere Caches...");
      
      // Forciertes Neuladen aller Daten nach dem Import
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] })
      ]).then(() => {
        console.log("Alle Caches wurden erfolgreich invalidiert.");
      });
      
      // Hole total (neu + bereits existierend) und new (nur neu hinzugefügt) aus der Antwort
      const total = {
        deviceTypes: (data.total?.deviceTypes || 0),
        brands: (data.total?.brands || 0),
        models: (data.total?.models || 0),
        deviceIssues: (data.total?.deviceIssues || 0)
      };
      
      const newItems = {
        deviceTypes: (data.stats?.deviceTypes || 0),
        brands: (data.stats?.brands || 0),
        models: (data.stats?.models || 0),
        deviceIssues: (data.stats?.deviceIssues || 0)
      };
      
      // Berechne bestehende Einträge
      const existing = {
        deviceTypes: total.deviceTypes - newItems.deviceTypes,
        brands: total.brands - newItems.brands,
        models: total.models - newItems.models,
        deviceIssues: total.deviceIssues - newItems.deviceIssues
      };
      
      // Statistik anzeigen mit Unterscheidung zwischen neu und bereits vorhanden
      toast({
        title: "Import erfolgreich",
        description: `Es wurden ${total.deviceTypes} Gerätearten (${newItems.deviceTypes} neu), ${total.brands} Hersteller (${newItems.brands} neu), ${total.models} Modelle (${newItems.models} neu) und ${total.deviceIssues} Fehlereinträge (${newItems.deviceIssues} neu) importiert.`
      });
      
      // Datei zurücksetzen
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import fehlgeschlagen",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handler für die Dateiauswahl
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // Handler für den Import-Button
  const handleImport = () => {
    if (importFile) {
      importMutation.mutate(importFile);
    } else {
      toast({
        title: "Keine Datei ausgewählt",
        description: "Bitte wählen Sie eine JSON-Datei für den Import aus.",
        variant: "destructive"
      });
    }
  };

  // Funktion zum Importieren der Beispieldaten für Spielekonsolen
  const importConsoleSampleData = async () => {
    setIsImporting(true);
    setImportProgress(10);
    
    try {
      console.log('Importiere Beispieldaten für Spielekonsolen...');
      console.log('Beispieldaten:', ConsoleSampleData);
      
      setImportProgress(50);
      
      // Daten an den Server senden
      const response = await fetch('/api/superadmin/device-management/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': localStorage.getItem('userId') || ''
        },
        body: JSON.stringify(ConsoleSampleData),
        credentials: 'include'
      });
      
      setImportProgress(80);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Importieren der Spielekonsolen-Daten");
      }
      
      setImportProgress(100);
      
      const data = await response.json();
      
      // Caches invalidieren und Daten neu laden
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types/all"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] })
      ]);
      
      // Statistik anzeigen
      const total = {
        deviceTypes: (data.total?.deviceTypes || 0),
        brands: (data.total?.brands || 0),
        models: (data.total?.models || 0),
        deviceIssues: (data.total?.deviceIssues || 0)
      };
      
      const newItems = {
        deviceTypes: (data.stats?.deviceTypes || 0),
        brands: (data.stats?.brands || 0),
        models: (data.stats?.models || 0),
        deviceIssues: (data.stats?.deviceIssues || 0)
      };
      
      toast({
        title: "Import erfolgreich",
        description: `Spielekonsolen-Daten wurden erfolgreich importiert: ${newItems.brands} Hersteller, ${newItems.models} Modelle und ${newItems.deviceIssues} Fehlereinträge.`
      });
      
      // Alle Daten aktualisieren
      refreshAllData();
      
    } catch (error) {
      console.error('Fehler beim Importieren der Spielekonsolen-Daten:', error);
      toast({
        title: "Import fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler beim Importieren der Spielekonsolen-Daten",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
      }, 1000);
    }
  };

  const handleCSVImportComplete = () => {
    refreshAllData();
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerätedaten exportieren/importieren</CardTitle>
          <CardDescription>
            Exportieren und importieren Sie alle Gerätetypen, Hersteller, Modelle und Fehlereinträge.
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshAllData}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2 hidden md:inline">Daten aktualisieren</span>
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="json-import">JSON-Import</TabsTrigger>
            <TabsTrigger value="csv-import">CSV-Import</TabsTrigger>
          </TabsList>
          
          <TabsContent value="export">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exportieren Sie alle Gerätedaten in eine JSON-Datei. Diese kann später wieder importiert oder als Backup verwendet werden.
              </p>
              <Button 
                onClick={() => exportMutation.mutate()}
                disabled={isExporting}
                className="w-full sm:w-auto"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportiere...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Gerätedaten exportieren
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="json-import">
            <div className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Importieren Sie Gerätedaten aus einer JSON-Datei. Bestehende Daten mit gleichem Namen werden nicht überschrieben.
                </p>
                
                <div className="grid gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                    id="import-file"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      disabled={isImporting}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      JSON-Datei auswählen
                    </Button>
                    
                    <Button 
                      onClick={handleImport}
                      disabled={!importFile || isImporting}
                      className="w-full sm:w-auto"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importiere...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Gerätedaten importieren
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {importFile && (
                    <div className="flex items-center text-sm">
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      <span className="truncate">{importFile.name}</span>
                    </div>
                  )}
                  
                  {isImporting && (
                    <Progress value={importProgress} className="h-2 w-full mt-2" />
                  )}
                </div>
              </div>
              
              <div className="pt-6 border-t mt-6">
                <h3 className="text-lg font-medium mb-2">Beispieldaten</h3>
                <Button 
                  onClick={importConsoleSampleData}
                  disabled={isImporting}
                  className="w-full sm:w-auto"
                  variant="outline"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importiere...
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      Spielekonsolen-Beispieldaten importieren
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Importiert Beispieldaten für Spielekonsolen (Sony, Microsoft, Nintendo) mit passenden Marken und Modellen.
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="csv-import">
            <CSVModelImport 
              deviceTypes={deviceTypes} 
              onImportComplete={handleCSVImportComplete} 
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DeviceDataExportImportWithCSV;