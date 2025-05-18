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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface DeleteCostEstimateDialogProps {
  open: boolean;
  onClose: () => void;
  estimateId: number;
  reference: string;
  afterDelete?: () => void;
}

export function DeleteCostEstimateDialog({
  open,
  onClose,
  estimateId,
  reference,
  afterDelete,
}: DeleteCostEstimateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutation zum Löschen des Kostenvoranschlags
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        'DELETE',
        `/api/cost-estimates/${estimateId}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Fehler beim Löschen des Kostenvoranschlags");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Kostenvoranschlag gelöscht",
        description: `Der Kostenvoranschlag ${reference} wurde erfolgreich gelöscht.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      if (afterDelete) afterDelete();
      else onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  const handleDelete = () => {
    setIsSubmitting(true);
    deleteMutation.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kostenvoranschlag löschen</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie den Kostenvoranschlag <strong>{reference}</strong> wirklich löschen?
            Dieser Vorgang kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isSubmitting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Löschen...
              </>
            ) : "Löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}