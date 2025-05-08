import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smartphone, Tablet, Laptop, Watch, Gamepad2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Interface für Fehlerbeschreibungen
interface DeviceIssue {
  id: number;
  deviceType: string;
  description: string;
  title: string;
  solution?: string;
  severity?: string;
  isCommon?: boolean;
}

export function ErrorCatalogTab() {
  const [bulkInput, setBulkInput] = useState<string>('');
  const [errorTable, setErrorTable] = useState<string[]>([]);
  const [deviceIssueMap, setDeviceIssueMap] = useState<{ [error: string]: { [deviceType: string]: boolean } }>({});
  
  const { toast } = useToast();
  
  // Gerätekategorien mit Icons und Namen als Tooltip - nur tatsächlich vorhandene Gerätetypen
  const deviceCategories = [
    { id: 'smartphone', name: 'Smartphone', icon: <Smartphone className="h-5 w-5" /> },
    { id: 'tablet', name: 'Tablet', icon: <Tablet className="h-5 w-5" /> },
    { id: 'laptop', name: 'Laptop', icon: <Laptop className="h-5 w-5" /> },
    { id: 'watch', name: 'Smartwatch', icon: <Watch className="h-5 w-5" /> },
    { id: 'spielekonsole', name: 'Spielekonsole', icon: <Gamepad2 className="h-5 w-5" /> }
  ];

  // Abrufen der existierenden Fehlerbeschreibungen
  const { data: deviceIssues, isLoading } = useQuery({
    queryKey: ['/api/device-issues'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/device-issues');
      const issues = await response.json();
      return issues as DeviceIssue[];
    }
  });

  // Mutation zum Speichern/Aktualisieren von Fehlerbeschreibungen
  const saveIssueMutation = useMutation({
    mutationFn: async (issueData: { title: string, deviceType: string, checked: boolean }) => {
      const { title, deviceType, checked } = issueData;
      
      if (checked) {
        // Fehlerbeschreibung hinzufügen
        await apiRequest('POST', '/api/device-issues', {
          description: title, // Für Kompatibilität mit älteren Implementierungen
          title,
          deviceType
        });
      } else {
        // Fehlerbeschreibung entfernen
        // Finde die ID aus den vorhandenen Fehlerbeschreibungen
        const issueToDelete = deviceIssues?.find(
          issue => issue.title === title && issue.deviceType === deviceType
        );
        
        if (issueToDelete) {
          await apiRequest('DELETE', `/api/device-issues/${issueToDelete.id}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-issues'] });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Speichern der Fehlerbeschreibung: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Verarbeitet die Änderung eines Checkboxes
  const handleCheckboxChange = (error: string, deviceType: string, checked: boolean) => {
    // Aktualisiere den lokalen Status
    setDeviceIssueMap(prevMap => ({
      ...prevMap,
      [error]: {
        ...(prevMap[error] || {}),
        [deviceType]: checked,
      },
    }));

    // Speichere die Änderung in der Datenbank
    saveIssueMutation.mutate({ title: error, deviceType, checked });
  };

  // Initialisiere den deviceIssueMap-Zustand beim Laden der vorhandenen Fehlerbeschreibungen
  useEffect(() => {
    if (deviceIssues) {
      const newMap: { [error: string]: { [deviceType: string]: boolean } } = {};
      
      deviceIssues.forEach(issue => {
        if (!newMap[issue.title]) {
          newMap[issue.title] = {};
        }
        newMap[issue.title][issue.deviceType] = true;
      });
      
      setDeviceIssueMap(newMap);
      
      // Initialisiere die errorTable mit den eindeutigen Fehlern
      const uniqueTitles = deviceIssues.map(issue => issue.title);
      // Dedupliziere die Fehlertitel mit Array-Methoden
      const uniqueErrors = uniqueTitles.filter((item, index) => uniqueTitles.indexOf(item) === index);
      setErrorTable(uniqueErrors.sort((a, b) => a.localeCompare(b, 'de')));
    }
  }, [deviceIssues]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBulkInput(e.target.value);
  };

  const generateTable = () => {
    // Extrahiere und bereinige die Zeilen, entferne Duplikate und sortiere alphabetisch
    const lines = bulkInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);
    
    // Dedupliziere die Zeilen mit Array-Methoden statt Set
    const uniqueLines = lines.filter((item, index) => lines.indexOf(item) === index);
    const sortedLines = uniqueLines.sort((a, b) => a.localeCompare(b, 'de'));
    
    setErrorTable(sortedLines);
    
    // Initialisiere deviceIssueMap für neue Einträge
    const newMap = { ...deviceIssueMap };
    sortedLines.forEach(error => {
      if (!newMap[error]) {
        newMap[error] = {};
        deviceCategories.forEach(category => {
          newMap[error][category.id] = false;
        });
      }
    });
    
    setDeviceIssueMap(newMap);
  };

  // Mutation zum Löschen aller vorhandenen Fehlerbeschreibungen
  const deleteAllIssuesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/device-issues/all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-issues'] });
      toast({
        title: 'Fehlerkatalog zurückgesetzt',
        description: 'Alle Fehlerbeschreibungen wurden gelöscht.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Löschen der Fehlerbeschreibungen: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Handler für "Fehlerkatalog zurücksetzen" Button
  const handleResetCatalog = async () => {
    if (confirm('Sind Sie sicher, dass Sie den gesamten Fehlerkatalog zurücksetzen möchten? Alle Einträge werden gelöscht.')) {
      deleteAllIssuesMutation.mutate();
      setErrorTable([]);
      setDeviceIssueMap({});
      setBulkInput('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Lade Fehlerkatalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex-grow">
          <Card>
            <CardHeader>
              <CardTitle>Fehlerkatalog</CardTitle>
              <CardDescription>
                Fügen Sie Fehler ein (einen pro Zeile) und generieren Sie die Tabelle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="bulkInput">Fehler (einer pro Zeile)</Label>
                  <Textarea 
                    id="bulkInput"
                    placeholder="z. B.&#10;Displaybruch&#10;Akku defekt&#10;Wasserschaden"
                    className="min-h-[150px] mt-2"
                    value={bulkInput}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    className="w-full sm:w-auto"
                    onClick={generateTable}
                  >
                    Tabelle erzeugen
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto"
                    onClick={handleResetCatalog}
                  >
                    Fehlerkatalog zurücksetzen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {errorTable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fehlerkatalog</CardTitle>
            <CardDescription>
              Wählen Sie die Gerätetypen aus, für die jeder Fehler relevant ist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] w-full rounded-md border">
              <div className="p-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left font-medium border w-full">Fehler</th>
                      {deviceCategories.map(category => (
                        <th key={category.id} className="p-2 text-center font-medium border" title={category.name}>
                          <div className="flex justify-center">
                            {category.icon}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {errorTable.map((error, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}>
                        <td className="p-2 border">{error}</td>
                        {deviceCategories.map(category => (
                          <td key={`${error}-${category.id}`} className="p-2 text-center border">
                            <Checkbox 
                              checked={deviceIssueMap[error]?.[category.id] || false}
                              onCheckedChange={(checked) => handleCheckboxChange(error, category.id, checked === true)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}