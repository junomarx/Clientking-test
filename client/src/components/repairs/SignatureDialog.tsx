import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomSignaturePad } from '@/components/ui/signature-pad';
import { useMutation } from '@tanstack/react-query';
import { Repair } from '@/lib/types';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, Smartphone, Loader2 } from 'lucide-react';
import { isMobileDevice, isPortraitMode } from '@/lib/deviceHelpers';

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
  repair?: Repair | null;
  // Signatur-Typ: 'dropoff' für die Abgabe des Geräts, 'pickup' für die Abholung
  signatureType?: 'dropoff' | 'pickup';
}

export function SignatureDialog({ 
  open, 
  onClose, 
  repairId, 
  repair, 
  signatureType = 'dropoff' 
}: SignatureDialogProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Überprüfung der Geräteausrichtung beim Öffnen des Dialogs
  useEffect(() => {
    if (!open) return;
    
    const checkOrientation = () => {
      setIsMobile(isMobileDevice());
      setIsPortrait(isPortraitMode());
    };
    
    // Beim Öffnen des Dialogs die Ausrichtung prüfen
    checkOrientation();
    
    // Event-Listener für Orientierungsänderungen
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [open]);
  
  // Titel und Beschreibung je nach Signatur-Typ
  const isDropoff = signatureType === 'dropoff';
  const dialogTitle = isDropoff 
    ? `Unterschrift bei Abgabe für Auftrag ${repair?.orderCode || `#${repairId}`}` 
    : `Unterschrift bei Abholung für Auftrag ${repair?.orderCode || `#${repairId}`}`;
  const dialogDescription = isDropoff
    ? 'Bitte unterschreiben Sie hier zur Bestätigung der Geräteabgabe zur Reparatur.'
    : 'Bitte unterschreiben Sie hier zur Bestätigung der Geräteabholung nach der Reparatur.';
  
  // Anfangswert für die Signatur je nach Typ
  const initialSignature = isDropoff 
    ? repair?.dropoffSignature 
    : repair?.pickupSignature;
  
  // Mutation zum Speichern der Unterschrift
  const signatureMutation = useMutation({
    mutationFn: async (signature: string) => {
      if (!repairId) throw new Error('Keine Reparatur-ID angegeben');
      
      // API-Endpunkt mit Signatur-Typ
      const response = await apiRequest('PATCH', `/api/repairs/${repairId}/signature/${signatureType}`, {
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
      
      // Erfolgsbenachrichtigung mit passender Nachricht
      toast({
        title: 'Unterschrift gespeichert',
        description: isDropoff 
          ? 'Die digitale Abgabe-Unterschrift wurde erfolgreich gespeichert.' 
          : 'Die digitale Abholungs-Unterschrift wurde erfolgreich gespeichert.',
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
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        
        {/* Rotation Hinweis für Mobilgeräte im Hochformat */}
        {isMobile && isPortrait && (
          <div className="mb-4 mt-2 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-3">
            <div className="flex-shrink-0 animate-pulse">
              <Smartphone className="h-8 w-8 text-amber-500 rotate-90" />
            </div>
            <div>
              <p className="font-medium text-amber-800">Bitte drehen Sie Ihr Gerät</p>
              <p className="text-sm text-amber-700">Für eine bessere Unterschriftserfahrung empfehlen wir, Ihr Gerät in den Querformat-Modus zu drehen.</p>
            </div>
          </div>
        )}
        
        <div className="pt-4">
          {signatureMutation.isPending ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <CustomSignaturePad 
              onSave={handleSaveSignature}
              onCancel={onClose}
              width={isMobile && !isPortrait ? 480 : 340}
              height={isMobile && !isPortrait ? 200 : 180}
              initialValue={initialSignature || undefined}
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
