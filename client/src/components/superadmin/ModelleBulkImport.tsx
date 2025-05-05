import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Check, Laptop, Smartphone, Tablet, Upload, Watch } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
  deviceTypeName?: string;
}

interface DeviceType {
  id: number;
  name: string;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

interface ModelleBulkImportProps {
  deviceTypes: string[] | undefined;
}

export default function ModelleBulkImport({ deviceTypes }: ModelleBulkImportProps) {
  const { toast } = useToast();
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [models, setModels] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importStats, setImportStats] = useState<{ imported: number; existing: number }>({ imported: 0, existing: 0 });

  // Alle Gerätetypen mit vollständigen Objekten abrufen
  const { data: allDeviceTypes } = useQuery<DeviceType[]>({
    queryKey: ["/api/superadmin/device-types/all"],
    enabled: true,
  });

  // Alle Marken abrufen
  const { data: brandsData } = useQuery<Brand[]>({
    queryKey: ["/api/superadmin/brands"],
    enabled: true,
  });

  // Gefilterte Marken basierend auf ausgewählten Gerätetyp
  const filteredBrands = brandsData?.filter(brand => {
    if (!selectedDeviceType || !allDeviceTypes) return false;
    
    const deviceType = allDeviceTypes.find(dt => dt.name === selectedDeviceType);
    if (!deviceType) return false;
    
    return brand.deviceTypeId === deviceType.id;
  }) || [];

  // Mutation für den Massenimport von Modellen
  const bulkImportModelsMutation = useMutation({
    mutationFn: async (data: { brandId: number; models: string[] }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-models/bulk', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Massenimport von Modellen');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setImportStats({
        imported: data.importedCount,
        existing: data.existingCount
      });
      setImportSuccess(true);
      setIsImporting(false);
      setModels('');
      
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      toast({
        title: "Import erfolgreich",
        description: `${data.importedCount} neue Modelle wurden importiert. ${data.existingCount} existierten bereits.`,
      });
    },
    onError: (error: Error) => {
      setIsImporting(false);
      toast({
        title: "Fehler beim Import",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit-Handler für den Massenimport von Modellen
  const handleImport = () => {
    if (!selectedBrandId) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Marke aus.",
        variant: "destructive",
      });
      return;
    }

    if (!models.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens ein Modell ein.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportSuccess(false);

    // Bereinigung der Eingabe: Leere Zeilen entfernen und trimmen
    const modelList = models
      .split('\n')
      .map(model => model.trim())
      .filter(model => model.length > 0);

    bulkImportModelsMutation.mutate({
      brandId: selectedBrandId,
      models: modelList
    });
  };

  // Zurücksetzen des Formulars
  const resetForm = () => {
    setSelectedDeviceType(null);
    setSelectedBrandId(null);
    setModels('');
    setImportSuccess(false);
  };

  // Gerätetyp-Icon basierend auf dem Namen
  const getDeviceTypeIcon = (type: string) => {
    const iconProps = { className: "h-5 w-5" };
    const normalizedType = type.toLowerCase();
    
    if (normalizedType.includes("smartphone") || normalizedType.includes("handy") || normalizedType.includes("phone")) {
      return <Smartphone {...iconProps} />;
    } else if (normalizedType.includes("tablet") || normalizedType.includes("pad")) {
      return <Tablet {...iconProps} />;
    } else if (normalizedType.includes("laptop") || normalizedType.includes("computer") || normalizedType.includes("pc")) {
      return <Laptop {...iconProps} />;
    } else if (normalizedType.includes("watch") || normalizedType.includes("uhr")) {
      return <Watch {...iconProps} />;
    } else {
      return <Smartphone {...iconProps} />; // Default-Icon
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelle Massenimport</CardTitle>
        <CardDescription>
          Importieren Sie mehrere Modelle für eine Marke auf einmal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deviceType">Gerätetyp</Label>
              <Select
                value={selectedDeviceType || "all"}
                onValueChange={(value) => {
                  setSelectedDeviceType(value === "all" ? null : value);
                  setSelectedBrandId(null); // Marke zurücksetzen bei Änderung des Gerätetyps
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Gerätetyp auswählen</SelectItem>
                  {deviceTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {getDeviceTypeIcon(type)}
                        <span>{type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="brand">Marke</Label>
              <Select
                value={selectedBrandId?.toString() || ""}
                onValueChange={(value) => setSelectedBrandId(parseInt(value))}
                disabled={!selectedDeviceType || filteredBrands.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Marke auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {filteredBrands.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Keine Marken verfügbar
                    </SelectItem>
                  ) : (
                    filteredBrands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="models">Modelle (ein Modell pro Zeile)</Label>
            <Textarea
              id="models"
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="iPhone 14\niPhone 14 Pro\niPhone 13\niPhone SE"
              className="min-h-[150px]"
              disabled={!selectedBrandId}
            />
          </div>

          {importSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle>Import erfolgreich!</AlertTitle>
              <AlertDescription>
                Es wurden {importStats.imported} neue Modelle importiert. {importStats.existing} Modelle existierten bereits.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={handleImport}
              disabled={isImporting || !selectedBrandId || !models.trim()}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>{isImporting ? "Importiere..." : "Modelle importieren"}</span>
            </Button>
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={isImporting}
            >
              Zurücksetzen
            </Button>
          </div>
          
          <div className="text-sm text-gray-500 mt-2">
            <p className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Hinweis: Modelle werden nur importiert, wenn sie noch nicht existieren.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
