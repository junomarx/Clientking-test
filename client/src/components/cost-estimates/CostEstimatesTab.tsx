import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, RefreshCcw, Trash, Edit, ClipboardCheck, Ban, Clock, FileSpreadsheet } from "lucide-react";
import { CostEstimatesGuard } from "./ProfessionalFeatureGuard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CreateCostEstimateForm from './SimpleCostEstimateForm';
import EditCostEstimateForm from './EditCostEstimateForm';
import ViewCostEstimateDetails from './ViewCostEstimateDetails';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Status-Badges für verschiedene Status
const StatusBadge = ({ status }: { status: string }) => {
  switch (status?.toLowerCase()) {
    case 'offen':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">Offen</Badge>;
    case 'angenommen':
      return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">Angenommen</Badge>;
    case 'abgelehnt':
      return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">Abgelehnt</Badge>;
    case 'abgelaufen':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50 border-gray-200">Abgelaufen</Badge>;
    default:
      return <Badge variant="outline">{status || 'Unbekannt'}</Badge>;
  }
};

export default function CostEstimatesTab() {
  const { toast } = useToast();
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  // Abfrage, ob der Benutzer die Funktion für Kostenvoranschläge nutzen darf
  const { data: costEstimatesPermission } = useQuery({
    queryKey: ["/api/can-use-cost-estimates"],
    queryFn: async () => {
      const response = await fetch("/api/can-use-cost-estimates");
      if (!response.ok) {
        // Wenn der Zugriff fehlschlägt, nehmen wir an, dass die Funktion nicht verfügbar ist
        return { canUseCostEstimates: false };
      }
      return response.json();
    },
  });
  
  // Prüfen, ob der Benutzer Kostenvoranschläge verwenden darf
  const canUseCostEstimates = costEstimatesPermission?.canUseCostEstimates === true;

  // Query für alle Kostenvoranschläge
  const { data: costEstimates, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/cost-estimates'],
    queryFn: async () => {
      // Prüfen, ob der Benutzer Kostenvoranschläge verwenden darf
      if (!canUseCostEstimates) {
        throw new Error('FEATURE_NOT_AVAILABLE');
      }
      
      const response = await fetch('/api/cost-estimates');
      if (!response.ok) {
        // Bei Fehlern mit Status 403 und spezifischem Error-Code abfangen
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData?.errorCode === "FEATURE_NOT_AVAILABLE") {
            throw new Error('FEATURE_NOT_AVAILABLE');
          }
        }
        throw new Error('Fehler beim Laden der Kostenvoranschläge');
      }
      return response.json();
    },
    // Die Abfrage nur ausführen, wenn der Benutzer die Funktion nutzen darf
    enabled: canUseCostEstimates
  });

  // Mutation zum Löschen eines Kostenvoranschlags
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/cost-estimates/${id}`);
      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Kostenvoranschlags');
      }
    },
    onSuccess: () => {
      toast({
        title: "Kostenvoranschlag gelöscht",
        description: "Der Kostenvoranschlag wurde erfolgreich gelöscht.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });

  // Mutation zum Ändern des Status eines Kostenvoranschlags
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await apiRequest('PATCH', `/api/cost-estimates/${id}/status`, { status });
      if (!response.ok) {
        throw new Error('Fehler beim Ändern des Status');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status aktualisiert",
        description: "Der Status des Kostenvoranschlags wurde erfolgreich aktualisiert.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });

  // Mutation zum Umwandeln eines Kostenvoranschlags in einen Reparaturauftrag
  const convertToRepairMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/cost-estimates/${id}/convert-to-repair`);
      if (!response.ok) {
        throw new Error('Fehler beim Umwandeln in einen Reparaturauftrag');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Umwandlung erfolgreich",
        description: "Der Kostenvoranschlag wurde erfolgreich in einen Reparaturauftrag umgewandelt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `${error}`,
        variant: "destructive",
      });
    }
  });

  // Definiere einen Typ für die Kostenvoranschlag-Objekte
  type CostEstimate = {
    id: number;
    referenceNumber: string;
    customerId: number;
    customerName: string;
    title: string;
    description?: string;
    deviceType: string;
    brand: string;
    model: string;
    serialNumber?: string;
    issue?: string;
    status: string;
    createdAt: string;
    validUntil?: string;
    taxRate: string;
    total: string;
    subtotal: string;
    taxAmount: string;
    notes?: string;
    items: Array<{
      position: number;
      description: string;
      quantity: number;
      unitPrice: string;
      totalPrice: string;
    }>;
    convertedToRepair?: boolean;
    acceptedAt?: string;
  };
  
  // Type-Guard für den costEstimates Array
  let typedCostEstimates: CostEstimate[] = [];
  if (costEstimates) {
    typedCostEstimates = costEstimates as CostEstimate[];
  }

  // Filtere die Kostenvoranschläge basierend auf dem ausgewählten Tab
  const filteredEstimates = React.useMemo(() => {
    if (!costEstimates) return [];
    
    switch (activeTab) {
      case "all":
        return costEstimates;
      case "open":
        return costEstimates.filter((est: CostEstimate) => est.status === 'offen');
      case "accepted":
        return costEstimates.filter((est: CostEstimate) => est.status === 'angenommen');
      case "rejected":
        return costEstimates.filter((est: CostEstimate) => est.status === 'abgelehnt');
      case "expired":
        return costEstimates.filter((est: CostEstimate) => est.status === 'abgelaufen');
      default:
        return costEstimates;
    }
  }, [costEstimates, activeTab]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // Prüfen, ob der Fehler wegen fehlendem Professional-Plan auftritt
  const isFeatureNotAvailableError = isError && canUseCostEstimates === false;

  // Statt der eigenen Implementierung für die Upgrade-Meldung nutzen wir die neue CostEstimatesGuard Komponente
  if (isFeatureNotAvailableError) {
    return (
      <CostEstimatesGuard>
        {/* Hier würde der eigentliche Inhalt kommen, der aber nur angezeigt wird, wenn der Benutzer Zugriff hat */}
        {/* Da wir hier im Fehlerfall sind, wird dieser Inhalt nie angezeigt */}
        <div></div>
      </CostEstimatesGuard>
    );
  }

  if (isError) {
    
    // Standard-Fehlermeldung für andere Fehler
    return (
      <div className="p-4 rounded-lg bg-red-50 text-red-600 border border-red-200">
        <h3 className="font-semibold mb-2">Fehler beim Laden der Daten</h3>
        <p>Die Kostenvoranschläge konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-2">
          <RefreshCcw className="w-4 h-4 mr-2" /> Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Kostenvoranschläge</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Kostenvoranschlag erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95%] md:w-[900px] sm:max-w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neuen Kostenvoranschlag erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie einen neuen Kostenvoranschlag für einen Kunden.
              </DialogDescription>
            </DialogHeader>
            <CreateCostEstimateForm 
              onSuccess={() => {
                toast({
                  title: "Kostenvoranschlag erstellt",
                  description: "Der Kostenvoranschlag wurde erfolgreich erstellt.",
                });
                queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
                setIsCreateDialogOpen(false); // Dialog schließen
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-lg">
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="open">Offen</TabsTrigger>
          <TabsTrigger value="accepted">Angenommen</TabsTrigger>
          <TabsTrigger value="rejected">Abgelehnt</TabsTrigger>
          <TabsTrigger value="expired">Abgelaufen</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {filteredEstimates?.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Keine Kostenvoranschläge gefunden.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref.-Nr.</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Gerätedetails</TableHead>
                      <TableHead>Erstelldatum</TableHead>
                      <TableHead>Gesamtsumme</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEstimates?.map((estimate: CostEstimate) => (
                      <TableRow key={estimate.id}>
                        <TableCell className="font-medium">{estimate.referenceNumber}</TableCell>
                        <TableCell>{estimate.customerName}</TableCell>
                        <TableCell>{estimate.brand} {estimate.model}</TableCell>
                        <TableCell>{new Date(estimate.createdAt).toLocaleDateString('de-DE')}</TableCell>
                        <TableCell className="font-medium">{estimate.total}</TableCell>
                        <TableCell><StatusBadge status={estimate.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {/* Detailansicht */}
                            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" 
                                  onClick={() => {
                                    setSelectedEstimateId(estimate.id);
                                    setIsViewDialogOpen(true);
                                  }}>
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[95%] md:w-[900px] sm:max-w-full max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Kostenvoranschlag Details</DialogTitle>
                                </DialogHeader>
                                {selectedEstimateId && (
                                  <ViewCostEstimateDetails 
                                    estimateId={selectedEstimateId} 
                                  />
                                )}
                              </DialogContent>
                            </Dialog>

                            {/* Bearbeiten-Button */}
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" 
                                  onClick={() => {
                                    setSelectedEstimateId(estimate.id);
                                    setIsEditDialogOpen(true);
                                  }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[95%] md:w-[900px] sm:max-w-full max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Kostenvoranschlag bearbeiten</DialogTitle>
                                </DialogHeader>
                                {selectedEstimateId && (
                                  <EditCostEstimateForm 
                                    estimateId={selectedEstimateId}
                                    onSuccess={() => {
                                      toast({
                                        title: "Kostenvoranschlag aktualisiert",
                                        description: "Der Kostenvoranschlag wurde erfolgreich aktualisiert.",
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
                                      setIsEditDialogOpen(false); // Dialog schließen nach erfolgreicher Aktualisierung
                                    }}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>

                            {/* Status-Button (nur für offene Kostenvoranschläge) */}
                            {estimate.status === 'offen' && (
                              <>
                                {/* Button zum Annehmen des Kostenvoranschlags */}
                                <Button variant="ghost" size="icon"
                                  onClick={() => statusMutation.mutate({ id: estimate.id, status: 'angenommen' })}>
                                  <ClipboardCheck className="w-4 h-4 text-green-600" />
                                </Button>
                                
                                {/* Button zum Ablehnen des Kostenvoranschlags */}
                                <Button variant="ghost" size="icon"
                                  onClick={() => statusMutation.mutate({ id: estimate.id, status: 'abgelehnt' })}>
                                  <Ban className="w-4 h-4 text-red-600" />
                                </Button>
                                
                                {/* Button zum Markieren als abgelaufen */}
                                <Button variant="ghost" size="icon"
                                  onClick={() => statusMutation.mutate({ id: estimate.id, status: 'abgelaufen' })}>
                                  <Clock className="w-4 h-4 text-gray-600" />
                                </Button>
                              </>
                            )}

                            {/* Umwandeln in Reparaturauftrag (nur für angenommene Kostenvoranschläge) */}
                            {estimate.status === 'angenommen' && !estimate.convertedToRepair && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>In Reparaturauftrag umwandeln</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Möchten Sie diesen Kostenvoranschlag in einen Reparaturauftrag umwandeln? 
                                      Diese Aktion kann nicht rückgängig gemacht werden.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => convertToRepairMutation.mutate(estimate.id)}>
                                      Umwandeln
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Löschen-Button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash className="w-4 h-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Kostenvoranschlag löschen</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Möchten Sie diesen Kostenvoranschlag wirklich löschen? 
                                    Diese Aktion kann nicht rückgängig gemacht werden.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteMutation.mutate(estimate.id)}>
                                    Löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}