import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, RefreshCw, Download, Upload } from "lucide-react";

export default function ErrorCatalogCSVImportExport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [csvData, setCsvData] = useState<string>("");
  const [importResult, setImportResult] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // CSV-Export-Mutation
  const exportCSVMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/superadmin/error-catalog/export-csv', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Exportieren der CSV-Datei');
      }
      
      return await response.text();
    },
    onSuccess: (csvContent) => {
      // CSV-Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fehlerkatalog.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "CSV-Export erfolgreich",
        description: "Der Fehlerkatalog wurde erfolgreich exportiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CSV-Export fehlgeschlagen",
        description: `Fehler beim Exportieren: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // CSV-Import-Mutation
  const importCSVMutation = useMutation({
    mutationFn: async () => {
      let formData = new FormData();
      
      if (file) {
        formData.append('file', file);
      } else if (csvData) {
        formData.append('csvData', csvData);
      } else {
        throw new Error('Keine CSV-Daten gefunden');
      }
      
      const response = await fetch('/api/superadmin/error-catalog/import-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Fehler beim Importieren der CSV-Datei');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setImportResult(data);
      setCsvData("");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      
      toast({
        title: "CSV-Import erfolgreich",
        description: `${data.stats.added} Einträge hinzugefügt, ${data.stats.updated} aktualisiert.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CSV-Import fehlgeschlagen",
        description: `Fehler beim Importieren: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Datei-Upload-Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  // CSV-Vorlage herunterladen
  const downloadCSVTemplate = () => {
    const templateContent = "errorText,forSmartphone,forTablet,forLaptop,forSmartwatch,forGameconsole\nDisplay defekt,true,true,false,false,false\nAkku defekt,true,true,true,true,false";
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fehlerkatalog-vorlage.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Daten neu laden
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
    toast({
      title: "Daten aktualisiert",
      description: "Die Fehlerkatalog-Daten wurden neu geladen.",
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Fehlerkatalog CSV Import/Export</CardTitle>
            <CardDescription>Fehlerkatalog als CSV importieren oder exportieren</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={refreshData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Daten aktualisieren
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
          
          <TabsContent value="export" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Exportieren Sie den gesamten Fehlerkatalog als CSV-Datei. Die Datei enthält alle Einträge im Fehlerkatalog.
              </p>
              
              <Button 
                onClick={() => exportCSVMutation.mutate()}
                disabled={exportCSVMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportCSVMutation.isPending ? "Exportiere..." : "CSV-Datei exportieren"}
              </Button>
              
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">CSV-Format</h3>
                <code className="text-xs bg-muted p-2 rounded block whitespace-pre overflow-x-auto">
                  errorText,forSmartphone,forTablet,forLaptop,forSmartwatch,forGameconsole<br />
                  Display defekt,true,true,false,false,false<br />
                  ...
                </code>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvData">CSV-Daten</Label>
                <Textarea
                  id="csvData"
                  placeholder="errorText,forSmartphone,forTablet,forLaptop,forSmartwatch,forGameconsole&#10;Display defekt,true,true,false,false,false&#10;Akku defekt,true,true,true,true,false"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Die erste Zeile muss Spaltenüberschriften enthalten (errorText, forSmartphone, forTablet, forLaptop, forSmartwatch, forGameconsole).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csvFile">Oder CSV-Datei hochladen</Label>
                <Input 
                  id="csvFile" 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                />
                {file && (
                  <p className="text-xs text-muted-foreground">
                    Ausgewählte Datei: {file.name} ({Math.round(file.size / 1024)} KB)
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadCSVTemplate}
                  className="text-xs"
                >
                  CSV-Vorlage herunterladen
                </Button>

                <Button
                  onClick={() => importCSVMutation.mutate()}
                  disabled={importCSVMutation.isPending || (!csvData && !file)}
                  className="w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {importCSVMutation.isPending ? "Importiere..." : "CSV-Datei importieren"}
                </Button>
              </div>

              {importResult && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>
                        <strong>Import abgeschlossen:</strong> {importResult.stats.total} Einträge verarbeitet
                      </p>
                      <ul className="list-disc list-inside text-sm">
                        <li className="text-green-600">Neu hinzugefügt: {importResult.stats.added}</li>
                        <li className="text-blue-600">Aktualisiert: {importResult.stats.updated}</li>
                        {importResult.stats.errors > 0 && (
                          <li className="text-red-600">Fehler: {importResult.stats.errors}</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}