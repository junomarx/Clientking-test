import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  CircleDollarSign,
  User,
  Key,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// Paket-Typ
interface Package {
  id: number;
  name: string;
  description: string | null;
  priceMonthly: number;
  createdAt: string;
  features?: PackageFeature[];
}

interface PackageFeature {
  packageId: number;
  feature: string;
  value?: any;
}

// Formular-Typ für neue und zu bearbeitende Pakete
interface PackageFormData {
  name: string;
  description: string;
  priceMonthly: number;
  features: { feature: string; value: any }[];
}

export default function SuperadminPackagesTab() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  
  // Initialer Zustand des Formulars
  const initialFormState: PackageFormData = {
    name: '',
    description: '',
    priceMonthly: 0,
    features: [
      { feature: 'canPrintLabels', value: true },
      { feature: 'canUseCostEstimates', value: true },
      { feature: 'canViewDetailedStats', value: true },
      { feature: 'canSendEmails', value: true },
      { feature: 'canManageGlobalDevices', value: false },
      { feature: 'maxRepairs', value: 1000 }
    ]
  };
  
  const [createForm, setCreateForm] = useState<PackageFormData>({ ...initialFormState });
  const [editForm, setEditForm] = useState<PackageFormData>({ ...initialFormState });

  // Pakete abrufen
  const { data: packages, isLoading: isLoadingPackages, error: packagesError } = useQuery<Package[]>({ 
    queryKey: ["/api/superadmin/packages"],
  });

  // Mutation zum Erstellen eines Pakets
  const createPackageMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      const response = await apiRequest("POST", "/api/superadmin/packages", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/packages"] });
      setIsCreateDialogOpen(false);
      setCreateForm({ ...initialFormState }); // Formular zurücksetzen
      toast({
        title: "Paket erstellt",
        description: "Das Paket wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Paket konnte nicht erstellt werden: ${error.message}`,
      });
    },
  });

  // Mutation zum Aktualisieren eines Pakets
  const updatePackageMutation = useMutation({
    mutationFn: async ({ packageId, data }: { packageId: number; data: PackageFormData }) => {
      const response = await apiRequest("PATCH", `/api/superadmin/packages/${packageId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/packages"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Paket aktualisiert",
        description: "Das Paket wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Paket konnte nicht aktualisiert werden: ${error.message}`,
      });
    },
  });

  // Mutation zum Löschen eines Pakets
  const deletePackageMutation = useMutation({
    mutationFn: async (packageId: number) => {
      await apiRequest("DELETE", `/api/superadmin/packages/${packageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/packages"] });
      toast({
        title: "Paket gelöscht",
        description: "Das Paket wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Paket konnte nicht gelöscht werden: ${error.message}`,
      });
    },
  });

  // Paket zur Bearbeitung auswählen
  const handleEditPackage = async (packageId: number) => {
    try {
      // Detaillierte Paketinformationen abrufen
      const response = await apiRequest("GET", `/api/superadmin/packages/${packageId}`);
      const packageData = await response.json();
      
      setSelectedPackage(packageData);
      
      // Formular vorbefüllen
      setEditForm({
        name: packageData.name,
        description: packageData.description || '',
        priceMonthly: packageData.priceMonthly,
        features: packageData.features || []
      });
      
      setIsEditDialogOpen(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Paketdaten konnten nicht geladen werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      });
    }
  };

  // Paket löschen
  const handleDeletePackage = (packageId: number) => {
    if (confirm("Sind Sie sicher, dass Sie dieses Paket löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deletePackageMutation.mutate(packageId);
    }
  };

  // Feature-Wert im Formular aktualisieren
  const updateFeatureValue = (formSetter: React.Dispatch<React.SetStateAction<PackageFormData>>, form: PackageFormData, featureName: string, value: any) => {
    const updatedFeatures = [...form.features];
    const featureIndex = updatedFeatures.findIndex(f => f.feature === featureName);
    
    if (featureIndex >= 0) {
      updatedFeatures[featureIndex] = { ...updatedFeatures[featureIndex], value };
    } else {
      updatedFeatures.push({ feature: featureName, value });
    }
    
    formSetter({ ...form, features: updatedFeatures });
  };

  // Feature-Wert aus dem Formular abrufen
  const getFeatureValue = (form: PackageFormData, featureName: string, defaultValue: any) => {
    const feature = form.features.find(f => f.feature === featureName);
    return feature ? feature.value : defaultValue;
  };

  if (packagesError) {
    toast({
      variant: "destructive",
      title: "Fehler beim Laden der Pakete",
      description: packagesError.message,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paketverwaltung</h1>
          <p className="text-muted-foreground">Verwalten Sie die verfügbaren Pakete und deren Features</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Neues Paket erstellen
        </Button>
      </div>
      
      {isLoadingPackages ? (
        <Skeleton className="w-full h-96" />
      ) : packages?.length ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description || 'Keine Beschreibung verfügbar'}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-base font-semibold ml-2">
                    <CircleDollarSign className="h-4 w-4 mr-1" /> {pkg.priceMonthly.toFixed(2)} €/Monat
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium mb-2">Features:</h4>
                  <ul className="space-y-1 text-sm">
                    {pkg.features?.map((feature) => (
                      <li key={feature.feature} className="flex items-center">
                        {typeof feature.value === 'boolean' ? (
                          feature.value ? (
                            <ToggleRight className="h-4 w-4 mr-2 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 mr-2 text-red-500" />
                          )
                        ) : (
                          <Key className="h-4 w-4 mr-2 text-blue-500" />
                        )}
                        <span className="font-medium">{feature.feature}:</span>
                        <span className="ml-2">
                          {typeof feature.value === 'boolean' 
                            ? (feature.value ? 'Aktiviert' : 'Deaktiviert')
                            : feature.value}
                        </span>
                      </li>
                    ))}
                    {!pkg.features?.length && (
                      <li className="text-muted-foreground italic">Keine Features konfiguriert</li>
                    )}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 p-3">
                <div className="flex justify-between w-full">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditPackage(pkg.id)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Bearbeiten
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDeletePackage(pkg.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Löschen
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Keine Pakete gefunden</CardTitle>
            <CardDescription>
              Es wurden noch keine Pakete erstellt. Klicken Sie auf "Neues Paket erstellen", um zu beginnen.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {/* Dialog zum Erstellen eines neuen Pakets */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Neues Paket erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Paket mit individuellen Features und Preisen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Paketname"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Beschreibung</Label>
              <Textarea 
                className="col-span-3 min-h-20"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Paketbeschreibung"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Preis (€/Monat)</Label>
              <Input 
                className="col-span-3"
                type="number"
                step="0.01"
                value={createForm.priceMonthly}
                onChange={(e) => setCreateForm({ ...createForm, priceMonthly: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-4 gap-4">
              <div className="text-right">
                <Label>Features</Label>
              </div>
              <div className="col-span-3 space-y-4">
                {/* Boolean Features */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Etiketten drucken</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateFeatureValue(
                        setCreateForm,
                        createForm,
                        'canPrintLabels',
                        !getFeatureValue(createForm, 'canPrintLabels', true)
                      )}
                    >
                      {getFeatureValue(createForm, 'canPrintLabels', true) ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2 text-green-500" /> Aktiviert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2 text-red-500" /> Deaktiviert
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Kostenvoranschläge nutzen</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateFeatureValue(
                        setCreateForm,
                        createForm,
                        'canUseCostEstimates',
                        !getFeatureValue(createForm, 'canUseCostEstimates', true)
                      )}
                    >
                      {getFeatureValue(createForm, 'canUseCostEstimates', true) ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2 text-green-500" /> Aktiviert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2 text-red-500" /> Deaktiviert
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Detaillierte Statistiken</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateFeatureValue(
                        setCreateForm,
                        createForm,
                        'canViewDetailedStats',
                        !getFeatureValue(createForm, 'canViewDetailedStats', true)
                      )}
                    >
                      {getFeatureValue(createForm, 'canViewDetailedStats', true) ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2 text-green-500" /> Aktiviert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2 text-red-500" /> Deaktiviert
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>E-Mails versenden</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateFeatureValue(
                        setCreateForm,
                        createForm,
                        'canSendEmails',
                        !getFeatureValue(createForm, 'canSendEmails', true)
                      )}
                    >
                      {getFeatureValue(createForm, 'canSendEmails', true) ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2 text-green-500" /> Aktiviert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2 text-red-500" /> Deaktiviert
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Numerical Features */}
                <div className="pt-2">
                  <div className="flex items-center gap-4">
                    <Label>Max. Reparaturen</Label>
                    <Input 
                      type="number" 
                      className="max-w-[150px]" 
                      value={getFeatureValue(createForm, 'maxRepairs', 1000)}
                      onChange={(e) => updateFeatureValue(
                        setCreateForm,
                        createForm,
                        'maxRepairs',
                        parseInt(e.target.value) || 0
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => createPackageMutation.mutate(createForm)}
              disabled={!createForm.name || createForm.priceMonthly <= 0}
            >
              Paket erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Bearbeiten eines Pakets */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Paket bearbeiten: {selectedPackage?.name}</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Paketinformationen und Features.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Paketname"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Beschreibung</Label>
              <Textarea 
                className="col-span-3 min-h-20"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Paketbeschreibung"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Preis (€/Monat)</Label>
              <Input 
                className="col-span-3"
                type="number"
                step="0.01"
                value={editForm.priceMonthly}
                onChange={(e) => setEditForm({ ...editForm, priceMonthly: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-4 gap-4">
              <div className="text-right">
                <Label>Features</Label>
              </div>
              <div className="col-span-3 space-y-4">
                {/* Boolean Features */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Etiketten drucken</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateFeatureValue(
                        setEditForm,
                        editForm,
                        'canPrintLabels',
                        !getFeatureValue(editForm, 'canPrintLabels', true)
                      )}
                    >
                      {getFeatureValue(editForm, 'canPrintLabels', true) ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2 text-green-500" /> Aktiviert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2 text-red-500" /> Deaktiviert
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Kostenvoranschläge nutzen</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateFeatureValue(
                        setEditForm,
                        editForm,
                        'canUseCostEstimates',
                        !getFeatureValue(editForm, 'canUseCostEstimates', true)
                      )}
                    >
                      {getFeatureValue(editForm, 'canUseCostEstimates', true) ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2 text-green-500" /> Aktiviert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2 text-red-500" /> Deaktiviert
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Detaillierte Statistiken</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateFeatureValue(
                        setEditForm,
                        editForm,
                        'canViewDetailedStats',
                        !getFeatureValue(editForm, 'canViewDetailedStats', true)
                      )}
                    >
                      {getFeatureValue(editForm, 'canViewDetailedStats', true) ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2 text-green-500" /> Aktiviert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2 text-red-500" /> Deaktiviert
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>E-Mails versenden</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateFeatureValue(
                        setEditForm,
                        editForm,
                        'canSendEmails',
                        !getFeatureValue(editForm, 'canSendEmails', true)
                      )}
                    >
                      {getFeatureValue(editForm, 'canSendEmails', true) ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2 text-green-500" /> Aktiviert
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2 text-red-500" /> Deaktiviert
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Numerical Features */}
                <div className="pt-2">
                  <div className="flex items-center gap-4">
                    <Label>Max. Reparaturen</Label>
                    <Input 
                      type="number" 
                      className="max-w-[150px]" 
                      value={getFeatureValue(editForm, 'maxRepairs', 1000)}
                      onChange={(e) => updateFeatureValue(
                        setEditForm,
                        editForm,
                        'maxRepairs',
                        parseInt(e.target.value) || 0
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => selectedPackage && updatePackageMutation.mutate({ packageId: selectedPackage.id, data: editForm })}
              disabled={!editForm.name || editForm.priceMonthly <= 0}
            >
              Paket aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
