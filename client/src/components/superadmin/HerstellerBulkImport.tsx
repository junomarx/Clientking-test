import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface HerstellerBulkImportProps {
  deviceTypes: string[] | undefined;
}

export default function HerstellerBulkImport({ deviceTypes }: HerstellerBulkImportProps) {
  const { toast } = useToast();
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("");
  const [brandsInput, setBrandsInput] = useState<string>("");
  
  // Mutation für den Bulk-Import von Herstellern
  const bulkImportMutation = useMutation({
    mutationFn: async (data: { deviceType: string; brands: string[] }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-brands/bulk', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Massenimport der Hersteller');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] });
      toast({
        title: "Erfolg",
        description: `${data.importedCount} Hersteller erfolgreich importiert.`,
      });
      // Textfeld zurücksetzen
      setBrandsInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Funktion zum Verarbeiten und Absenden der Hersteller
  const handleSubmit = () => {
    // Prüfen, ob ein Gerätetyp ausgewählt wurde
    if (!selectedDeviceType) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Gerätetyp aus.",
        variant: "destructive",
      });
      return;
    }

    // Zeilen aufteilen und leere Zeilen/Leerzeichen entfernen
    const brandsArray = brandsInput
      .split('\n')
      .map(brand => brand.trim())
      .filter(brand => brand.length > 0);

    // Prüfen, ob Hersteller vorhanden sind
    if (brandsArray.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens einen Hersteller ein.",
        variant: "destructive",
      });
      return;
    }

    // API-Anfrage senden
    bulkImportMutation.mutate({
      deviceType: selectedDeviceType,
      brands: brandsArray
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hersteller-Massenimport</CardTitle>
        <CardDescription>
          Fügen Sie mehrere Hersteller auf einmal hinzu, indem Sie einen Hersteller pro Zeile eingeben
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="deviceType">
              Gerätetyp
            </label>
            <Select 
              value={selectedDeviceType} 
              onValueChange={setSelectedDeviceType}
            >
              <SelectTrigger id="deviceType" className="w-full">
                <SelectValue placeholder="Gerätetyp auswählen" />
              </SelectTrigger>
              <SelectContent>
                {deviceTypes?.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="brands">
              Hersteller (ein Hersteller pro Zeile)
            </label>
            <Textarea
              id="brands"
              value={brandsInput}
              onChange={(e) => setBrandsInput(e.target.value)}
              placeholder="Apple\nSamsung\nHuawei\n..."
              rows={5}
              className="font-mono"
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={bulkImportMutation.isPending}
            className="w-full"
          >
            {bulkImportMutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Speichern...
              </>
            ) : (
              "Hersteller speichern"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
