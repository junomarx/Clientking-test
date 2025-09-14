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
import { useMutation, useQuery } from '@tanstack/react-query';
import { Repair } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { RotateCcw, Smartphone, Loader2, Tablet, Clock, CheckCircle, XCircle } from 'lucide-react';
import { isMobileDevice, isPortraitMode } from '@/lib/deviceHelpers';

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
  repair?: Repair | null;
  // Signatur-Typ: 'dropoff' für die Abgabe des Geräts, 'pickup' für die Abholung
  signatureType?: 'dropoff' | 'pickup';
}

interface KioskAvailability {
  totalKiosks: number;
  onlineCount: number;
  kiosks: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    isOnline: boolean;
  }>;
}

export function SignatureDialog({ 
  open, 
  onClose, 
  repairId, 
  repair, 
  signatureType = 'dropoff' 
}: SignatureDialogProps) {
  const { toast } = useToast();
  const { sendMessage } = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // ACK-Mechanismus State
  const [kioskRequestStatus, setKioskRequestStatus] = useState<'idle' | 'sending' | 'waiting' | 'ack_received' | 'failed'>('idle');
  const [currentTempId, setCurrentTempId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);

  // Kiosk-Verfügbarkeit abrufen
  const { data: kioskAvailability } = useQuery<KioskAvailability>({
    queryKey: ['/api/kiosk/availability', repair?.customerId],
    enabled: open && !!repair?.customerId,
    refetchInterval: 5000, // Alle 5 Sekunden aktualisieren
  });
  
  // WebSocket-Listener für ACK und Complete Events
  useEffect(() => {
    if (!open || !currentTempId) return;

    const handleWebSocketMessage = (event: CustomEvent) => {
      const message = event.detail;
      
      if (message.type === 'signature-ack' && message.tempId === currentTempId) {
        console.log(`✅ PC: ACK empfangen für tempId: ${currentTempId}`);
        setKioskRequestStatus('ack_received');
        
        // Retry-Timer stoppen
        if (retryTimer) {
          clearTimeout(retryTimer);
          setRetryTimer(null);
        }
        
        toast({
          title: 'Kiosk bereit',
          description: 'Unterschrift wird am Kiosk gestartet. Leiten Sie den Kunden zum Tablet.',
        });
      }
      
      if (message.type === 'signature-complete' && message.tempId === currentTempId) {
        console.log(`🎉 PC: Unterschrift vollständig für tempId: ${currentTempId}`);
        
        toast({
          title: 'Unterschrift erhalten',
          description: 'Die Unterschrift wurde erfolgreich vom Kiosk übertragen.',
        });
        
        // Dialog schließen und Cache invalidieren
        queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
        onClose();
      }
    };

    window.addEventListener('kioskWebSocketMessage', handleWebSocketMessage as EventListener);
    
    return () => {
      window.removeEventListener('kioskWebSocketMessage', handleWebSocketMessage as EventListener);
    };
  }, [open, currentTempId, retryTimer, onClose]);

  // Retry-Mechanismus
  const startRetryTimer = () => {
    const timer = setTimeout(() => {
      if (retryCount < 3) {
        console.log(`🔄 PC: Retry ${retryCount + 1} für tempId: ${currentTempId}`);
        setRetryCount(prev => prev + 1);
        
        if (sendMessage && currentTempId) {
          sendMessage({
            type: 'signature-request-retry',
            tempId: currentTempId,
            retryCount: retryCount + 1,
            payload: {
              repairId,
              customerName: `Kunde ${repair?.customerId || 'unbekannt'}`,
              repairDetails: repair?.issue,
              deviceInfo: `${repair?.deviceType} ${repair?.brand} ${repair?.model}`,
              orderCode: repair?.orderCode,
              estimatedCost: repair?.estimatedCost,
              status: repair?.status
            }
          });
        }
        
        // Nächsten Retry planen
        startRetryTimer();
      } else {
        console.log(`❌ PC: Maximale Retries erreicht für tempId: ${currentTempId}`);
        setKioskRequestStatus('failed');
        
        toast({
          title: 'Kiosk nicht erreichbar',
          description: 'Bitte verwenden Sie den QR-Code für die Unterschrift.',
          variant: 'destructive',
        });
      }
    }, 1000); // 1 Sekunde Timeout
    
    setRetryTimer(timer);
  };

  // Neue Kiosk-Senden Funktion mit ACK-Mechanismus
  const sendToKioskWithAck = () => {
    const tempId = `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentTempId(tempId);
    setKioskRequestStatus('sending');
    setRetryCount(0);
    
    console.log(`🎯 PC: Sende Signaturanfrage mit tempId: ${tempId}`);
    
    if (sendMessage) {
      sendMessage({
        type: 'signature-request',
        tempId,
        repairId,
        timestamp: Date.now(),
        payload: {
          repairId,
          customerName: `Kunde ${repair?.customerId || 'unbekannt'}`,
          repairDetails: repair?.issue,
          deviceInfo: `${repair?.deviceType} ${repair?.brand} ${repair?.model}`,
          orderCode: repair?.orderCode,
          estimatedCost: repair?.estimatedCost,
          status: repair?.status
        }
      });
      
      setKioskRequestStatus('waiting');
      startRetryTimer();
    } else {
      setKioskRequestStatus('failed');
      toast({
        title: 'Verbindungsfehler',
        description: 'WebSocket-Verbindung nicht verfügbar.',
        variant: 'destructive',
      });
    }
  };

  // Legacy Kiosk-Senden Mutation (Fallback)
  const sendToKioskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/send-to-kiosk', {
        repairId: repairId
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.hasActiveKiosks) {
        toast({
          title: `An ${kioskAvailability?.onlineCount || 1} Kiosk${(kioskAvailability?.onlineCount || 1) > 1 ? 's' : ''} gesendet`,
          description: data.message || 'Die Unterschrifts-Anfrage wurde an das Kiosk-Gerät gesendet.',
        });
        onClose();
      } else {
        toast({
          title: 'Kein Kiosk verfügbar',
          description: data.message || 'Nutzen Sie den QR-Code für die Unterschrift.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Fehler',
        description: `Anfrage konnte nicht gesendet werden: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Cleanup beim Schließen des Dialogs
  useEffect(() => {
    if (!open) {
      // Reset aller Kiosk-States
      setKioskRequestStatus('idle');
      setCurrentTempId(null);
      setRetryCount(0);
      
      // Timer löschen
      if (retryTimer) {
        clearTimeout(retryTimer);
        setRetryTimer(null);
      }
    }
  }, [open, retryTimer]);

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
    ? `Unterschrift bei Abgabe für Auftrag ${repair?.orderCode || ''}` 
    : `Unterschrift bei Abholung für Auftrag ${repair?.orderCode || ''}`;
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
        
        {/* Kiosk-Gerät Option mit ACK-Status */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Tablet className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">
                  {kioskAvailability?.onlineCount ? 
                    `An ${kioskAvailability.onlineCount} von ${kioskAvailability.totalKiosks} Kiosk${kioskAvailability.totalKiosks > 1 ? 's' : ''} senden` :
                    `Kiosk offline (0/${kioskAvailability?.totalKiosks || 0})`
                  }
                </h3>
                <p className="text-sm text-blue-700">
                  {kioskRequestStatus === 'ack_received' 
                    ? 'Kiosk ist bereit - leiten Sie den Kunden zum Tablet'
                    : kioskRequestStatus === 'waiting'
                    ? `Verbindung wird hergestellt... (Versuch ${retryCount}/3)`
                    : kioskAvailability?.onlineCount 
                      ? 'Kunde kann direkt am Kiosk-Gerät unterschreiben'
                      : 'Kein Kiosk online - verwenden Sie die manuelle Unterschrift unten'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={sendToKioskWithAck}
              disabled={kioskRequestStatus === 'sending' || kioskRequestStatus === 'waiting'}
              variant="outline"
              className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
            >
              {kioskRequestStatus === 'sending' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Senden...
                </>
              )}
              {kioskRequestStatus === 'waiting' && (
                <>
                  <Clock className="h-4 w-4 animate-pulse mr-2" />
                  Warte... ({retryCount}/3)
                </>
              )}
              {kioskRequestStatus === 'ack_received' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Kiosk bereit
                </>
              )}
              {kioskRequestStatus === 'failed' && (
                <>
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                  Fehlgeschlagen
                </>
              )}
              {kioskRequestStatus === 'idle' && (
                <>
                  <Tablet className="h-4 w-4 mr-2" />
                  {kioskAvailability?.onlineCount ? 
                    `An ${kioskAvailability.onlineCount} von ${kioskAvailability.totalKiosks} Kiosk${kioskAvailability.totalKiosks > 1 ? 's' : ''} senden` :
                    `Kein Kiosk online (0/${kioskAvailability?.totalKiosks || 0})`
                  }
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 mb-4">
          oder
        </div>

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
