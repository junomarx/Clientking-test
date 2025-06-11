import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Package, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SparePartsDialog from "@/components/spare-parts/SparePartsDialog";
import type { SparePart } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface SparePartsManagementDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number;
}

const statusColors: Record<string, string> = {
  bestellen: "bg-red-100 text-red-800",
  bestellt: "bg-yellow-100 text-yellow-800", 
  eingetroffen: "bg-green-100 text-green-800",
};

const statusLabels: Record<string, string> = {
  bestellen: "Bestellen",
  bestellt: "Bestellt",
  eingetroffen: "Eingetroffen",
};

export function SparePartsManagementDialog({ 
  open, 
  onClose, 
  repairId 
}: SparePartsManagementDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sparePartToDelete, setSparePartToDelete] = useState<SparePart | undefined>();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: spareParts = [], isLoading } = useQuery<SparePart[]>({
    queryKey: [`/api/repairs/${repairId}/spare-parts`],
    enabled: open && !!repairId,
  });

  // Check if all spare parts have arrived and update repair status
  const updateRepairStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/repairs/${repairId}/status`, {
        status: "ersatzteile_eingetroffen"
      });
      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren des Reparaturstatus");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs/waiting-for-parts"] });
      toast({
        title: "Status aktualisiert",
        description: "Reparaturstatus wurde auf 'Ersatzteile eingetroffen' gesetzt.",
      });
    },
  });

  // Check if all parts have arrived whenever spare parts data changes
  useEffect(() => {
    if (spareParts.length > 0) {
      const allPartsArrived = spareParts.every(part => part.status === 'eingetroffen');
      if (allPartsArrived) {
        // Automatically update repair status
        updateRepairStatusMutation.mutate();
      }
    }
  }, [spareParts]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/spare-parts/${id}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/repairs/${repairId}/spare-parts`] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs/waiting-for-parts"] });
      toast({
        title: "Ersatzteil gelöscht",
        description: "Das Ersatzteil wurde erfolgreich entfernt.",
      });
      setDeleteDialogOpen(false);
      setSparePartToDelete(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (sparePart: SparePart) => {
    setEditingSparePart(sparePart);
    setDialogOpen(true);
  };

  const handleDelete = (sparePart: SparePart) => {
    setSparePartToDelete(sparePart);
    setDeleteDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingSparePart(undefined);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sparePartToDelete) {
      deleteMutation.mutate(sparePartToDelete.id);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingSparePart(undefined);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ersatzteile verwalten - Reparatur #{repairId}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {spareParts.length} Ersatzteile
                </Badge>
                {spareParts.length > 0 && (
                  <Badge 
                    variant={spareParts.every(p => p.status === 'eingetroffen') ? "default" : "outline"}
                    className={spareParts.every(p => p.status === 'eingetroffen') ? "bg-green-100 text-green-800" : ""}
                  >
                    {spareParts.every(p => p.status === 'eingetroffen') 
                      ? "Alle eingetroffen" 
                      : `${spareParts.filter(p => p.status === 'eingetroffen').length} von ${spareParts.length} eingetroffen`
                    }
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={handleCreateNew}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ersatzteil hinzufügen
              </Button>
            </div>

            {/* Spare Parts Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4 animate-pulse" />
                  <span>Lade Ersatzteile...</span>
                </div>
              </div>
            ) : spareParts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Ersatzteile
                </h3>
                <p className="text-gray-500 mb-4">
                  Fügen Sie Ersatzteile für diese Reparatur hinzu.
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Erstes Ersatzteil hinzufügen
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ersatzteil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spareParts.map((sparePart) => (
                      <TableRow key={sparePart.id}>
                        <TableCell className="font-medium">
                          {sparePart.partName}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={statusColors[sparePart.status]}
                          >
                            {statusLabels[sparePart.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(sparePart)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sparePart)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog für Erstellen/Bearbeiten */}
      <SparePartsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        repairId={repairId}
        sparePart={editingSparePart}
        mode={editingSparePart ? "edit" : "create"}
      />

      {/* Lösch-Bestätigung */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ersatzteil löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie das Ersatzteil "{sparePartToDelete?.partName}" löschen möchten? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}