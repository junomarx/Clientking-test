import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Import } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FehlerkatalogBulkImportProps {
  deviceTypes?: string[];
}

const FehlerkatalogBulkImport: React.FC<FehlerkatalogBulkImportProps> = ({ deviceTypes = [] }) => {
  const [deviceType, setDeviceType] = useState<string>("");
  const [errors, setErrors] = useState<string>("");
  const { toast } = useToast();

  // Mutation für den Massenimport von Fehlereinträgen
  const bulkImportMutation = useMutation({
    mutationFn: async ({ deviceType, errors }: { deviceType: string; errors: string[] }) => {
      const response = await apiRequest("POST", "/api/superadmin/device-issues/bulk", {
        deviceType,
        errors
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Massenimport von Fehlereinträgen');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Erfolg",
        description: `${data.importedCount} Fehlereinträge wurden importiert, ${data.existingCount} existieren bereits.`,
      });
      setErrors(""); // Textfeld leeren nach erfolgreichem Import
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!deviceType) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Gerätetyp aus.",
        variant: "destructive",
      });
      return;
    }

    if (!errors.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens einen Fehlereintrag ein.",
        variant: "destructive",
      });
      return;
    }

    // Fehlereinträge an den Zeilenumbrüchen trennen und leere Zeilen filtern
    const errorsList = errors
      .split("\n")
      .map(error => error.trim())
      .filter(error => error.length > 0);

    if (errorsList.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie gültige Fehlereinträge ein.",
        variant: "destructive",
      });
      return;
    }

    bulkImportMutation.mutate({ deviceType, errors: errorsList });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fehlerkatalog-Massenimport</CardTitle>
        <CardDescription>
          Fügen Sie mehrere Fehlereinträge für einen Gerätetyp auf einmal hinzu
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deviceType">Gerätetyp</Label>
          <Select 
            value={deviceType}
            onValueChange={setDeviceType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
            </SelectTrigger>
            <SelectContent>
              {deviceTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="errors">
            Fehlereinträge (ein Eintrag pro Zeile)
          </Label>
          <Textarea
            id="errors"
            placeholder="Geben Sie Fehlereinträge ein, einen pro Zeile. Z.B.\nDisplaybruch\nAkku defekt\nKeine Verbindung zum WLAN\nKamera funktioniert nicht"
            className="min-h-32"
            value={errors}
            onChange={(e) => setErrors(e.target.value)}
          />
        </div>

        <Button
          type="button"
          onClick={handleImport}
          disabled={bulkImportMutation.isPending}
          className="w-full"
        >
          {bulkImportMutation.isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Importiere...
            </>
          ) : (
            <>
              <Import className="mr-2 h-4 w-4" />
              Fehlereinträge importieren
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FehlerkatalogBulkImport;
