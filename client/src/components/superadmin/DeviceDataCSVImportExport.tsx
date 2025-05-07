import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Download, Upload, RefreshCw, FileText, Database } from "lucide-react";

export default function DeviceDataCSVImportExport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [brandFile, setBrandFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  
  // Laden der Gerätetypen
  const { data: deviceTypes } = useQuery({
    queryKey: ['/api/superadmin/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/superadmin/device-types');
      const data = await res.json();
      return data;
    },
  });

  // JSON Export Mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/superadmin/device-management/export');
      return await res.json();
    },
    onSuccess: (data) => {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'geraete-daten-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export erfolgreich",
        description: "Die Gerätedaten wurden erfolgreich exportiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export fehlgeschlagen",
        description: `Fehler beim Exportieren der Daten: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // CSV Export für Marken
  const exportBrandsCSVMutation = useMutation({
    mutationFn: async (deviceType: string | null) => {
      let url = '/api/superadmin/brands/export-csv';
      if (deviceType) {
        url += `?deviceType=${encodeURIComponent(deviceType)}`;
      }
      const res = await apiRequest('GET', url);
      return await res.text();
    },
    onSuccess: (csvData) => {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedDeviceType 
        ? `marken-${selectedDeviceType.toLowerCase()}.csv` 
        : 'alle-marken.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "CSV-Export erfolgreich",
        description: "Die Marken wurden erfolgreich als CSV exportiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CSV-Export fehlgeschlagen",
        description: `Fehler beim Exportieren der Marken: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // CSV Export für Modelle
  const exportModelsCSVMutation = useMutation({
    mutationFn: async (deviceType: string | null) => {
      let url = '/api/superadmin/models/export-csv';
      if (deviceType) {
        url += `?deviceType=${encodeURIComponent(deviceType)}`;
      }
      const res = await apiRequest('GET', url);
      return await res.text();
    },
    onSuccess: (csvData) => {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedDeviceType 
        ? `modelle-${selectedDeviceType.toLowerCase()}.csv` 
        : 'alle-modelle.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "CSV-Export erfolgreich",
        description: "Die Modelle wurden erfolgreich als CSV exportiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CSV-Export fehlgeschlagen",
        description: `Fehler beim Exportieren der Modelle: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // CSV Import für Marken
  const importBrandsCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/superadmin/brands/import-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Fehler beim Importieren der Marken');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      setBrandFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/brands'] });
      
      toast({
        title: "CSV-Import erfolgreich",
        description: `${data.importedCount} Marken wurden erfolgreich importiert.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CSV-Import fehlgeschlagen",
        description: `Fehler beim Importieren der Marken: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // CSV Import für Modelle
  const importModelsCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/superadmin/models/import-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Fehler beim Importieren der Modelle');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      setModelFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/models'] });
      
      toast({
        title: "CSV-Import erfolgreich",
        description: `${data.importedCount} Modelle wurden erfolgreich importiert.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CSV-Import fehlgeschlagen",
        description: `Fehler beim Importieren der Modelle: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Download einer CSV-Vorlage für Marken
  const downloadBrandTemplateCSV = () => {
    const headers = "name,deviceType\n";
    const examples = [
      "Apple,Smartphone",
      "Samsung,Smartphone",
      "Huawei,Smartphone",
      "Lenovo,Laptop",
      "Sony,Spielekonsole"
    ].join("\n");
    
    const csvContent = headers + examples;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marken-vorlage.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Vorlage heruntergeladen",
      description: "Die CSV-Vorlage für Marken wurde heruntergeladen.",
    });
  };

  // Download einer CSV-Vorlage für Modelle
  const downloadModelTemplateCSV = () => {
    const headers = "name,brandName,deviceType\n";
    const examples = [
      "iPhone 13,Apple,Smartphone",
      "Galaxy S21,Samsung,Smartphone",
      "P40 Pro,Huawei,Smartphone",
      "ThinkPad X1,Lenovo,Laptop",
      "PlayStation 5,Sony,Spielekonsole"
    ].join("\n");
    
    const csvContent = headers + examples;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelle-vorlage.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Vorlage heruntergeladen",
      description: "Die CSV-Vorlage für Modelle wurde heruntergeladen.",
    });
  };

  const handleBrandFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBrandFile(e.target.files[0]);
    }
  };

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setModelFile(e.target.files[0]);
    }
  };

  const handleImportBrands = () => {
    if (brandFile) {
      importBrandsCSVMutation.mutate(brandFile);
    } else {
      toast({
        title: "Keine Datei ausgewählt",
        description: "Bitte wählen Sie eine CSV-Datei für den Import aus.",
        variant: "destructive",
      });
    }
  };

  const handleImportModels = () => {
    if (modelFile) {
      importModelsCSVMutation.mutate(modelFile);
    } else {
      toast({
        title: "Keine Datei ausgewählt",
        description: "Bitte wählen Sie eine CSV-Datei für den Import aus.",
        variant: "destructive",
      });
    }
  };

  const handleExportBrandsCSV = () => {
    exportBrandsCSVMutation.mutate(selectedDeviceType);
  };

  const handleExportModelsCSV = () => {
    exportModelsCSVMutation.mutate(selectedDeviceType);
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/superadmin/brands'] });
    queryClient.invalidateQueries({ queryKey: ['/api/superadmin/models'] });
    queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-types'] });
    
    toast({
      title: "Daten aktualisiert",
      description: "Die Gerätedaten wurden aktualisiert.",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>CSV Import/Export</CardTitle>
            <CardDescription>Marken und Modelle als CSV importieren oder exportieren</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={refreshData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Daten aktualisieren
            </Button>
            <Button variant="secondary" onClick={() => exportMutation.mutate()}>
              <Database className="mr-2 h-4 w-4" />
              JSON Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="export">CSV Export</TabsTrigger>
            <TabsTrigger value="import">CSV Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export">
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <h3 className="text-lg font-medium mb-2">Daten exportieren</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label htmlFor="exportDeviceType">Gerätetyp (optional)</Label>
                    <Select 
                      value={selectedDeviceType || "all"} 
                      onValueChange={(value) => setSelectedDeviceType(value === "all" ? null : value)}
                    >
                      <SelectTrigger id="exportDeviceType">
                        <SelectValue placeholder="Alle Gerätetypen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Gerätetypen</SelectItem>
                        {deviceTypes?.map((type: string) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wählen Sie einen Gerätetyp für einen gefilterten Export
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 mt-6">
                  <Button onClick={handleExportBrandsCSV} disabled={exportBrandsCSVMutation.isPending}>
                    <FileText className="mr-2 h-4 w-4" />
                    {selectedDeviceType ? `${selectedDeviceType} Marken exportieren` : "Alle Marken exportieren"}
                  </Button>
                  <Button onClick={handleExportModelsCSV} disabled={exportModelsCSVMutation.isPending}>
                    <FileText className="mr-2 h-4 w-4" />
                    {selectedDeviceType ? `${selectedDeviceType} Modelle exportieren` : "Alle Modelle exportieren"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <div className="space-y-6">
              <div className="rounded-md border p-4">
                <h3 className="text-lg font-medium">Marken importieren</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Die CSV-Datei für Marken sollte die Spalten "name" und "deviceType" enthalten.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="brandFile">CSV-Datei auswählen</Label>
                    <Input 
                      id="brandFile" 
                      type="file" 
                      accept=".csv" 
                      onChange={handleBrandFileChange}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button onClick={handleImportBrands} disabled={!brandFile || importBrandsCSVMutation.isPending} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Marken importieren
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button variant="outline" onClick={downloadBrandTemplateCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Vorlage für Marken herunterladen
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="rounded-md border p-4">
                <h3 className="text-lg font-medium">Modelle importieren</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Die CSV-Datei für Modelle sollte die Spalten "name", "brandName" und "deviceType" enthalten.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="modelFile">CSV-Datei auswählen</Label>
                    <Input 
                      id="modelFile" 
                      type="file" 
                      accept=".csv" 
                      onChange={handleModelFileChange}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button onClick={handleImportModels} disabled={!modelFile || importModelsCSVMutation.isPending} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Modelle importieren
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button variant="outline" onClick={downloadModelTemplateCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Vorlage für Modelle herunterladen
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Hinweis: Die CSV-Dateien sollten UTF-8 kodiert sein und Komma (,) als Trennzeichen verwenden.
        </p>
      </CardFooter>
    </Card>
  );
}