import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CSVBrandImportProps {
  deviceTypes: string[];
  onImportComplete?: () => void;
}

export default function CSVBrandImport({ deviceTypes, onImportComplete }: CSVBrandImportProps) {
  const [deviceType, setDeviceType] = useState<string>('');
  const [csvData, setCsvData] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!deviceType) {
      toast({
        title: 'Gerätetyp fehlt',
        description: 'Bitte wähle einen Gerätetyp aus.',
        variant: 'destructive',
      });
      return;
    }

    if (!csvData) {
      toast({
        title: 'CSV-Daten fehlen',
        description: 'Bitte füge CSV-Daten ein oder lade eine CSV-Datei hoch.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await apiRequest('POST', '/api/superadmin/device-brands/import-csv', {
        deviceType,
        csvData,
      });

      const result = await response.json();
      setResult(result);

      if (result.success) {
        toast({
          title: 'Import erfolgreich',
          description: `${result.stats.added} Marken wurden importiert.`,
        });
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        toast({
          title: 'Import fehlgeschlagen',
          description: result.message || 'Ein unbekannter Fehler ist aufgetreten.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import fehlgeschlagen',
        description: 'Ein Fehler ist beim Import aufgetreten.',
        variant: 'destructive',
      });
      console.error('CSV import error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setDeviceType('');
    setCsvData('');
    setResult(null);
  };

  const downloadCSVTemplate = () => {
    const template = "brand,name,Brand,Name\nSamsung\nApple\nHuawei\nXiaomi";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marken-vorlage.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>CSV-Import für Marken</CardTitle>
        <CardDescription>
          Importiere Marken für einen bestimmten Gerätetyp über CSV
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="deviceType">Gerätetyp</Label>
            <Select value={deviceType} onValueChange={setDeviceType}>
              <SelectTrigger id="deviceType">
                <SelectValue placeholder="Wähle einen Gerätetyp" />
              </SelectTrigger>
              <SelectContent>
                {deviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csvData">CSV-Daten</Label>
            <Textarea
              id="csvData"
              placeholder="brand,name,Brand,Name&#10;Samsung&#10;Apple&#10;Huawei"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="min-h-[150px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Die erste Zeile sollte Spaltenüberschriften enthalten (brand, name, Brand oder Name).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csvFile">Oder CSV-Datei hochladen</Label>
            <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadCSVTemplate}
              className="text-xs"
            >
              CSV-Vorlage herunterladen
            </Button>
          </div>

          {result && (
            <Alert className={result.success ? 'bg-green-50' : 'bg-red-50'}>
              <AlertTitle>{result.success ? 'Import erfolgreich!' : 'Import fehlgeschlagen'}</AlertTitle>
              <AlertDescription>
                {result.success ? (
                  <div>
                    <p>Insgesamt: {result.stats.total} Marken</p>
                    <p>Hinzugefügt: {result.stats.added} Marken</p>
                    <p>Übersprungen: {result.stats.skipped} Marken (bereits vorhanden)</p>
                    <p>Fehler: {result.stats.errors} Marken</p>
                  </div>
                ) : (
                  result.message
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleReset}>
          Zurücksetzen
        </Button>
        <Button onClick={handleImport} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Marken importieren
        </Button>
      </CardFooter>
    </Card>
  );
}