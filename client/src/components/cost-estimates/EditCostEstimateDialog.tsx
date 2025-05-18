import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EditCostEstimateDialogProps {
  open: boolean;
  onClose: () => void;
  estimateId: number;
  afterSave?: () => void;
}

export function EditCostEstimateDialog({ open, onClose, estimateId, afterSave }: EditCostEstimateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kostenvoranschlag abrufen
  const { data: estimate, isLoading } = useQuery({
    queryKey: ['/api/cost-estimates', estimateId],
    enabled: open && estimateId !== null,
  });

  // Mutation zum Aktualisieren des Kostenvoranschlags
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(
        'PATCH',
        `/api/cost-estimates/${estimateId}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Kostenvoranschlag aktualisiert",
        description: "Der Kostenvoranschlag wurde erfolgreich aktualisiert.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      if (afterSave) afterSave();
      else onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  // Diese Komponente ist vereinfacht - in der Realität würde hier ein vollständiges Formular stehen
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Kostenvoranschlag bearbeiten</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <p>Diese Funktion wird in einer zukünftigen Version implementiert. 
               Im Moment können Sie den Kostenvoranschlag nur über das Formular zum Erstellen bearbeiten.</p>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button 
                disabled={isSubmitting}
                onClick={() => {
                  setIsSubmitting(true);
                  toast({
                    title: "Hinweis",
                    description: "Die Bearbeitungsfunktion ist noch nicht vollständig implementiert.",
                  });
                  setIsSubmitting(false);
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Speichern...
                  </>
                ) : "Speichern"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}