import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SignaturePadComponent } from '@/components/ui/signature-pad';
import { useMutation } from '@tanstack/react-query';
import { Repair } from '@/lib/types';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
  repair?: Repair | null;
}

export function SignatureDialog({ open, onClose, repairId, repair }: SignatureDialogProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  
  // Mutation zum Speichern der Unterschrift
  const signatureMutation = useMutation({
    mutationFn: async (signature: string) => {
      if (!repairId) throw new Error('Keine Reparatur-ID angegeben');
      
      const response = await apiRequest('PATCH', `/api/repairs/${repairId}/signature`, {
        signature,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Fehler beim Speichern der Unterschrift');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Cache invalidieren
      queryClient.invalidateQueries({queryKey: ['/api/repairs']});
      queryClient.invalidateQueries({queryKey: ['/api/repairs', repairId]});
      
      toast({
        title: 'Unterschrift gespeichert',
        description: 'Die digitale Unterschrift wurde erfolgreich gespeichert.',
        variant: 'success',
      });
      
      onClose();
    },
    onError: (error) => {
      setError(error.message);
      toast({
        title: 'Fehler',
        description: `Die Unterschrift konnte nicht gespeichert werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Unterschrift speichern
  const handleSaveSignature = (signature: string) => {
    signatureMutation.mutate(signature);
  };
  
  if (!repairId) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unterschrift für Auftrag {repair?.orderCode || `#${repairId}`}</DialogTitle>
          <DialogDescription>
            Bitte unterschreiben Sie hier, um den Reparaturauftrag zu bestätigen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="pt-4">
          {signatureMutation.isPending ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <SignaturePad 
              onSave={handleSaveSignature}
              onCancel={onClose}
              width={340}
              height={200}
              initialValue={repair?.customerSignature || undefined}
            />
          )}
        </div>
        
        {error && (
          <div className="text-sm text-destructive mt-2">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
