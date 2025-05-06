import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, AlertCircle, Trash2, Check } from "lucide-react";

interface ModelleBulkImportProps {
  deviceTypes?: string[];
}

interface UserBrand {
  id: number;
  name: string;
  deviceTypeId: number;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

interface UserDeviceType {
  id: number;
  name: string;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

export default function ModelleBulkImport({ deviceTypes }: ModelleBulkImportProps) {
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("");
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [modelsList, setModelsList] = useState<string>("");
  const [importStatus, setImportStatus] = useState<{
    loading: boolean;
    success: boolean;
    error: string | null;
    importedCount: number;
    existingCount: number;
    totalCount: number;
  }>({
    loading: false,
    success: false,
    error: null,
    importedCount: 0,
    existingCount: 0,
    totalCount: 0,
  });

  const { toast } = useToast();

  // Gerätetypen direkt für Dropdown abrufen
  const { data: userDeviceTypes } = useQuery<UserDeviceType[]>({
    queryKey: ["/api/superadmin/device-types/all"],
    enabled: true,
  });

  // Alle Marken abrufen
  const { data: brandsData, isLoading: isLoadingBrands } = useQuery<UserBrand[]>({
    queryKey: ["/api/superadmin/brands"],
    enabled: true,
  });

  // Gefiltertes Array von Marken basierend auf dem ausgewählten Gerätetyp
  const filteredBrands = brandsData ? brandsData.filter(brand => {
    if (!selectedDeviceType) return true;
    
    // Finde die ID des ausgewählten Gerätetyps (case-insensitive)
    const deviceType = userDeviceTypes?.find(dt => 
      dt.name.toLowerCase() === selectedDeviceType.toLowerCase()
    );
    if (!deviceType) return false;
    
    return brand.deviceTypeId === deviceType.id;
  }) : [];

  // Markenname basierend auf der ID finden
  const getSelectedBrandName = () => {
    if (!selectedBrandId || !brandsData) return "";
    const brand = brandsData.find(b => b.id === selectedBrandId);
    return brand ? brand.name : "";
  };

  // Name des ausgewählten Gerätetyps als ID für die Markensuche verwenden
  const handleDeviceTypeChange = (value: string) => {
    setSelectedDeviceType(value);
    setSelectedBrandId(null); // Brand zurücksetzen bei Änderung des Gerätetyps
  };

  // Mutation zum Importieren der Modelle
  const importModelsMutation = useMutation({
    mutationFn: async (data: { brandId: number; models: string[] }) => {
      const response = await apiRequest("POST", "/api/superadmin/device-models/bulk", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Importieren der Modelle");
      }
      return response.json();
    },
    onMutate: () => {
      setImportStatus(prev => ({ ...prev, loading: true, error: null }));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      setImportStatus({
        loading: false,
        success: true,
        error: null,
        importedCount: data.importedCount || 0,
        existingCount: data.existingCount || 0,
        totalCount: data.totalCount || 0,
      });
      
      // Erfolgsmeldung anzeigen
      toast({
        title: "Import erfolgreich",
        description: `${data.importedCount} neue Modelle wurden importiert. ${data.existingCount} existierten bereits.`,
      });
      
      // Formularfelder zurücksetzen
      setTimeout(() => {
        setImportStatus(prev => ({ ...prev, success: false }));
      }, 3000);
    },
    onError: (error: Error) => {
      console.error("Fehler beim Importieren:", error);
      setImportStatus({
        loading: false,
        success: false,
        error: error.message,
        importedCount: 0,
        existingCount: 0,
        totalCount: 0,
      });
      
      toast({
        title: "Fehler beim Import",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!selectedBrandId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Marke aus.",
        variant: "destructive",
      });
      return;
    }

    if (!modelsList.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens ein Modell ein.",
        variant: "destructive",
      });
      return;
    }

    // Liste der Modelle als Array verarbeiten (zeilenweise aufteilen)
    const models = modelsList
      .split("\n")
      .map(model => model.trim())
      .filter(model => model.length > 0);

    if (models.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens ein gültiges Modell ein.",
        variant: "destructive",
      });
      return;
    }

    // Massenimport durchführen
    importModelsMutation.mutate({ brandId: selectedBrandId, models });
  };

  const handleClearForm = () => {
    setSelectedDeviceType("");
    setSelectedBrandId(null);
    setModelsList("");
    setImportStatus({
      loading: false,
      success: false,
      error: null,
      importedCount: 0,
      existingCount: 0,
      totalCount: 0,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modell Massenimport</CardTitle>
        <CardDescription>
          Importieren Sie mehrere Modelle für eine bestimmte Marke auf einmal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="deviceType">Gerätetyp auswählen</Label>
              <Select
                value={selectedDeviceType}
                onValueChange={handleDeviceTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  )) || null}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="brand">Marke auswählen</Label>
              <Select
                value={selectedBrandId?.toString() || ""}
                onValueChange={(value) => setSelectedBrandId(parseInt(value))}
                disabled={!selectedDeviceType || isLoadingBrands}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Marke auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {filteredBrands.length > 0 ? (
                    filteredBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-brands" disabled>
                      Keine Marken für diesen Gerätetyp
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="modelsList">
              Modelle (ein Modell pro Zeile)
              {selectedDeviceType && selectedBrandId && (
                <span className="ml-2 text-sm text-muted-foreground">
                  für {getSelectedBrandName()} ({selectedDeviceType})
                </span>
              )}
            </Label>
            <Textarea
              id="modelsList"
              placeholder="iPhone 16\niPhone 16 Plus\niPhone 16 Pro\niPhone 16 Pro Max\niPhone 16e"
              className="h-40 font-mono"
              value={modelsList}
              onChange={(e) => setModelsList(e.target.value)}
              disabled={!selectedBrandId}
            />
          </div>

          {importStatus.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{importStatus.error}</AlertDescription>
            </Alert>
          )}

          {importStatus.success && (
            <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
              <Check className="h-4 w-4" />
              <AlertDescription>
                Import erfolgreich
                <div>
                  {importStatus.importedCount} neue Modelle wurden importiert.
                  {importStatus.existingCount > 0 && ` ${importStatus.existingCount} existierten bereits.`}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleClearForm}
              disabled={importStatus.loading}
              className="flex items-center"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Formular zurücksetzen
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                importStatus.loading ||
                !selectedBrandId ||
                !modelsList.trim()
              }
              className="flex items-center"
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {importStatus.loading ? "Importiere..." : "Modelle importieren"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
