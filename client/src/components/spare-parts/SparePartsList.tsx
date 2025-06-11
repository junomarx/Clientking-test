import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SparePartsDialog from "./SparePartsDialog";
import type { SparePart } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface SparePartsListProps {
  repairId: number;
}

const statusColors = {
  bestellen: "bg-red-100 text-red-800",
  bestellt: "bg-yellow-100 text-yellow-800", 
  eingetroffen: "bg-green-100 text-green-800",
};

const statusLabels = {
  bestellen: "Bestellen",
  bestellt: "Bestellt",
  eingetroffen: "Eingetroffen",
};

export default function SparePartsList({ repairId }: SparePartsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePart | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sparePartToDelete, setSparePartToDelete] = useState<SparePart | undefined>();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: spareParts = [], isLoading } = useQuery<SparePart[]>({
    queryKey: ["/api/repairs", repairId, "spare-parts"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/spare-parts/${id}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs", repairId, "spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Package className="h-4 w-4" />
        <span>Lade Ersatzteile...</span>
      </div>
    );
  }

  const hasSpareParts = spareParts.length > 0;

  return (
    <div className="space-y-3">
      {/* Header mit Toggle-Button und Anzahl */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 p-0 text-sm font-medium hover:bg-transparent"
        >
          <Package className="h-4 w-4 mr-2" />
          Ersatzteile ({spareParts.length})
          {hasSpareParts && (
            <span className="ml-2 text-xs">
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateNew}
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
          Hinzufügen
        </Button>
      </div>

      {/* Ersatzteile-Liste (nur wenn erweitert oder keine Ersatzteile vorhanden) */}
      {(isExpanded || !hasSpareParts) && (
        <div className="rounded-lg border">
          {!hasSpareParts ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Keine Ersatzteile für diese Reparatur
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ersatzteil</TableHead>
                  <TableHead>Lieferant</TableHead>
                  <TableHead>Kosten</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bestelldatum</TableHead>
                  <TableHead>Lieferdatum</TableHead>
                  <TableHead className="w-[100px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spareParts.map((sparePart) => (
                  <TableRow key={sparePart.id}>
                    <TableCell className="font-medium">
                      {sparePart.partName}
                    </TableCell>
                    <TableCell>{sparePart.supplier || "-"}</TableCell>
                    <TableCell>{sparePart.cost} €</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={statusColors[sparePart.status]}
                      >
                        {statusLabels[sparePart.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sparePart.orderDate 
                        ? format(new Date(sparePart.orderDate), "dd.MM.yyyy", { locale: de })
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {sparePart.deliveryDate 
                        ? format(new Date(sparePart.deliveryDate), "dd.MM.yyyy", { locale: de })
                        : "-"
                      }
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
          )}
        </div>
      )}

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
    </div>
  );
}