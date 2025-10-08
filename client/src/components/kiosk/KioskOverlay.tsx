import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKioskMode } from "@/hooks/use-kiosk-mode";
import { KioskCustomerForm } from "@/components/kiosk/KioskCustomerForm";
import { KioskSignature } from "@/components/kiosk/KioskSignature";
import { Tablet, Shield, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import clientKingLogo from "@/assets/images/logos/clientking-logo.png";

export function KioskOverlay() {
  const { isKioskMode, deactivateKioskMode, signatureRequest, clearSignatureRequest } = useKioskMode();
  const { user } = useAuth();
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [currentView, setCurrentView] = useState<'home' | 'customer-form' | 'signature'>('home');
  
  // Geschäftseinstellungen für Logo abrufen (Kiosk-spezifischer Endpunkt)
  const { data: businessSettings, isLoading, error } = useQuery({
    queryKey: ['/api/kiosk/business-settings', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/kiosk/business-settings?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch business settings');
      return response.json();
    },
    enabled: isKioskMode && !!user?.id, // Nur laden wenn Kiosk-Modus aktiv ist und User-ID verfügbar
  });



  if (!isKioskMode) return null;

  const handleExitAttempt = async () => {
    if (pin.trim() === "") return;
    
    // Master-PIN für Emergency-Logout (funktioniert immer, auch bei Session-Timeout)
    const MASTER_PIN = "678910";
    
    if (pin === MASTER_PIN) {
      // Sofortiger Logout ohne API-Call
      deactivateKioskMode();
      setShowExitDialog(false);
      setPin("");
      
      // Zusätzlich User ausloggen falls Session noch aktiv
      try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.reload(); // Seite neu laden für sauberen Zustand
      } catch (error) {
        // Ignorieren - Master-PIN soll immer funktionieren
        window.location.reload();
      }
      return;
    }
    
    try {
      // Normale PIN validation via API
      const response = await fetch('/api/validate-kiosk-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      if (response.ok) {
        deactivateKioskMode();
        setShowExitDialog(false);
        setPin("");
      } else {
        alert("Falscher PIN. Zugang verweigert.");
        setPin("");
      }
    } catch (error) {
      alert("Fehler bei der PIN-Validierung. Versuchen Sie den Master-PIN 678910.");
      setPin("");
    }
  };

  // Automatisches Öffnen der Unterschrift bei eingehender Anfrage
  if (signatureRequest && currentView !== 'signature') {
    setCurrentView('signature');
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'customer-form':
        return (
          <KioskCustomerForm 
            onSuccess={() => setCurrentView('home')}
            onCancel={() => setCurrentView('home')}
          />
        );
      case 'signature':
        return (
          <KioskSignature 
            onSuccess={() => {
              clearSignatureRequest();
              setCurrentView('home');
            }}
            onCancel={() => {
              clearSignatureRequest();
              setCurrentView('home');
            }}
          />
        );
      default:
        return (
          <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
            <div className="w-full h-full bg-white p-10 text-center relative">
              {/* Logo */}
              <div className="mb-12">
                {businessSettings?.logoUrl ? (
                  <img 
                    src={businessSettings.logoUrl} 
                    alt={businessSettings.businessName || "Firmenlogo"}
                    className="max-h-56 max-w-[460px] mx-auto object-contain"
                  />
                ) : (
                  <img 
                    src={clientKingLogo} 
                    alt="Firmenlogo"
                    className="max-h-56 max-w-[460px] mx-auto object-contain"
                  />
                )}
              </div>

              {/* Info Text */}
              <div className="text-lg mb-8">
                Bitte geben Sie Ihre Daten für die Auftragserfassung ein.
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={() => setCurrentView('customer-form')}
                  className="block w-full max-w-md mx-auto px-4 py-4 text-lg bg-blue-600 text-white border-none rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  KUNDENDATEN EINGEBEN
                </button>
                
                {signatureRequest && (
                  <button 
                    onClick={() => setCurrentView('signature')}
                    className="block w-full max-w-md mx-auto px-4 py-4 text-lg bg-blue-600 text-white border-none rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    UNTERSCHRIFT LEISTEN
                  </button>
                )}
                
                {/* Zur Unterschrift Button - immer anzeigen */}
                <button 
                  onClick={() => window.location.reload()}
                  className="block w-full max-w-[268px] mx-auto px-4 py-4 text-lg bg-green-600 text-white border-none rounded-md cursor-pointer hover:bg-green-700 transition-colors"
                >
                  ZUR UNTERSCHRIFT
                </button>
              </div>

              {/* Privacy Note */}
              <div className="mt-8 text-sm text-gray-600">
                Ihre Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.
              </div>

              {/* Admin Link */}
              <div 
                onClick={() => setShowExitDialog(true)}
                className="absolute bottom-4 right-5 text-xs text-gray-400 cursor-pointer hover:underline"
              >Clientking</div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Fullscreen Overlay */}
      <div className="fixed inset-0 z-50 bg-white overflow-hidden">
        {renderCurrentView()}
      </div>

      {/* Exit PIN Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kiosk-Modus verlassen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exit-pin">Admin-PIN eingeben</Label>
              <Input
                id="exit-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExitAttempt()}
                placeholder="PIN eingeben"
                className="text-center text-lg"
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleExitAttempt} 
                disabled={!pin.trim()}
                className="flex-1"
              >
                Bestätigen
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowExitDialog(false);
                  setPin("");
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}