import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tablet, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useKioskMode } from '@/hooks/use-kiosk-mode';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

export function KioskActivationButton() {
  const { isKioskMode, activateKioskMode, deactivateKioskMode } = useKioskMode();
  const { logoutMutation } = useAuth();
  const { toast } = useToast();
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [isExitMode, setIsExitMode] = useState(false); // Neue State für Exit vs. Activate

  const validatePinMutation = useMutation({
    mutationFn: async (enteredPin: string) => {
      const response = await apiRequest('POST', '/api/validate-kiosk-pin', {
        pin: enteredPin
      });
      return response.json();
    },
    onSuccess: () => {
      setShowPinDialog(false);
      setPin('');
      
      if (isExitMode) {
        // Kiosk-Modus verlassen → Kioskmitarbeiter direkt ausloggen
        console.log('🚪 Kiosk-Modus verlassen - Starte direkten Logout');
        toast({
          title: 'Kiosk-Modus verlassen',
          description: 'Sie werden ausgeloggt...',
        });
        // Direkter API-Aufruf für Logout
        apiRequest('POST', '/api/logout').then(() => {
          console.log('✅ Logout erfolgreich - Weiterleitung...');
          window.location.href = '/auth';
        }).catch((error) => {
          console.error('❌ Logout Fehler:', error);
          window.location.href = '/auth';
        });
      } else {
        // Kiosk-Modus aktivieren
        activateKioskMode();
        toast({
          title: 'Kiosk-Modus aktiviert',
          description: 'Das Gerät wurde erfolgreich in den Kiosk-Modus geschaltet.',
        });
      }
      
      setIsExitMode(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Ungültige PIN',
        description: 'Die eingegebene PIN ist nicht korrekt.',
        variant: 'destructive',
      });
    },
  });

  const handleKioskToggle = () => {
    if (isKioskMode) {
      // Kiosk-Modus verlassen → PIN-Dialog anzeigen
      setIsExitMode(true);
      setShowPinDialog(true);
    } else {
      // Kiosk-Modus aktivieren → PIN-Dialog anzeigen
      setIsExitMode(false);
      setShowPinDialog(true);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      validatePinMutation.mutate(pin);
    }
  };

  return (
    <>
      <Button
        onClick={handleKioskToggle}
        variant={isKioskMode ? "destructive" : "outline"}
        size="sm"
        className={`flex items-center gap-2 ${
          isKioskMode 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'border-blue-600 text-blue-600 hover:bg-blue-50'
        }`}
      >
        <Tablet className="h-4 w-4" />
        {isKioskMode ? 'Kiosk beenden' : 'Kiosk-Modus'}
      </Button>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className={`h-5 w-5 ${isExitMode ? 'text-red-600' : 'text-blue-600'}`} />
              {isExitMode ? 'Kiosk-Modus verlassen' : 'Kiosk-Modus aktivieren'}
            </DialogTitle>
            <DialogDescription>
              {isExitMode 
                ? 'Bitte geben Sie die PIN ein, um den Kiosk-Modus zu verlassen. Sie werden anschließend ausgeloggt.'
                : 'Bitte geben Sie die Kiosk-PIN ein, um den Kiosk-Modus zu aktivieren.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pin">Kiosk-PIN</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-stellige PIN eingeben"
                maxLength={4}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPinDialog(false);
                  setPin('');
                  setIsExitMode(false);
                }}
                disabled={validatePinMutation.isPending}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={pin.length < 4 || validatePinMutation.isPending}
                className={isExitMode ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
              >
                {validatePinMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Prüfe PIN...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isExitMode ? 'Verlassen & Abmelden' : 'Aktivieren'}
                  </>
                )}
              </Button>
            </div>
          </form>
          
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Hinweis:</p>
                <p>Im Kiosk-Modus können Kunden ihre Daten selbst eingeben und digital unterschreiben.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}