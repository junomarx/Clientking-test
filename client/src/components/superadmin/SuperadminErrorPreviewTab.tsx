import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smartphone, Tablet, Laptop, Watch } from 'lucide-react';

export function SuperadminErrorPreviewTab() {
  const [bulkInput, setBulkInput] = useState<string>('');
  const [errorTable, setErrorTable] = useState<string[]>([]);
  
  // Gerätekategorien mit Icons und Namen als Tooltip
  const deviceCategories = [
    { id: 'smartphone', name: 'Smartphone', icon: <Smartphone className="h-5 w-5" /> },
    { id: 'tablet', name: 'Tablet', icon: <Tablet className="h-5 w-5" /> },
    { id: 'laptop', name: 'Laptop', icon: <Laptop className="h-5 w-5" /> },
    { id: 'watch', name: 'Smartwatch', icon: <Watch className="h-5 w-5" /> }
  ];

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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fehlerkatalog-Vorschau</h2>
          <p className="text-muted-foreground">
            Eine tabellarische Vorschau für den Fehlerkatalog mit Kategorisierung nach Gerätetypen
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fehlerkatalog Bulk-Import</CardTitle>
            <CardDescription>
              Fügen Sie eine Liste von Fehlern ein (einer pro Zeile) und erstellen Sie eine Vorschau der tabellarischen Darstellung
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
              <Button 
                className="w-full md:w-auto"
                onClick={generateTable}
              >
                Tabelle erzeugen
              </Button>
            </div>
          </CardContent>
        </Card>

        {errorTable.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tabellarische Vorschau</CardTitle>
              <CardDescription>
                Fehler nach Gerätetyp kategorisiert
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
                              <Checkbox />
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
    </div>
  );
}