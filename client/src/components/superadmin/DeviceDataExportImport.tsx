import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Download, Upload, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const DeviceDataExportImport: React.FC = () => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Invalidiere alle relevanten Daten
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] });
      // Modellreihen gibt es nicht mehr
      // queryClient.invalidateQueries({ queryKey: ["/api/superadmin/model-series"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Gerätedaten exportieren/importieren</CardTitle>
        <CardDescription>
          Exportieren und importieren Sie alle Gerätetypen, Hersteller, Modelle und Fehlereinträge.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export-Bereich */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Export</h3>
            <p className="text-sm text-muted-foreground">
              Exportieren Sie alle Gerätedaten in eine JSON-Datei.
            </p>
            <Button 
              onClick={() => exportMutation.mutate()}
              disabled={isExporting}
              className="w-full"
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

          {/* Import-Bereich */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Import</h3>
            <p className="text-sm text-muted-foreground">
              Importieren Sie Gerätedaten aus einer JSON-Datei.
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
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isImporting}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                JSON-Datei auswählen
              </Button>
              
              {importFile && (
                <div className="flex items-center text-sm">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="truncate">{importFile.name}</span>
                </div>
              )}
              
              <Button 
                onClick={handleImport}
                disabled={!importFile || isImporting}
                className="w-full"
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
              
              {isImporting && (
                <Progress value={importProgress} className="h-2 w-full mt-2" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceDataExportImport;